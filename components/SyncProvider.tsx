'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { db } from '@/lib/db';
import { datenZusammenfuehren, datenUeberschreiben } from '@/lib/db-operations';
import { encryptPayload, decryptPayload, getRoomHash } from '@/lib/encryption';
import { useToast } from './Toast';

export type SyncStatus = 'disconnected' | 'syncing' | 'connected' | 'error' | 'kv_missing';

interface SyncContextType {
  status: SyncStatus;
  roomName: string;
  autoSync: boolean;
  errorMsg: string;
  saveSettings: (roomName: string, autoSync: boolean) => void;
  triggerPush: () => Promise<void>;
  triggerPull: () => Promise<void>;
  triggerOverwriteRemote: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | null>(null);

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();

  const [roomName, setRoomName] = useState('');
  const [autoSync, setAutoSync] = useState(true);

  const [status, setStatus] = useState<SyncStatus>('disconnected');
  const [errorMsg, setErrorMsg] = useState('');

  // Flag to prevent loop bounces when applying remote data
  const isApplyingRemoteSyncRef = useRef(false);
  const debouncePushRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track JSON content hash to avoid re-uploading or re-processing identical states
  const lastContentHashRef = useRef<string>('');

  // Load settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRoom = (localStorage.getItem('klisten_sync_room') || '').trim();
      const savedAuto = localStorage.getItem('klisten_sync_auto') !== 'false';
      setRoomName(savedRoom);
      setAutoSync(savedAuto);
    }
  }, []);

  // Upload local database encrypted to Cloud Storage
  const pushToCloud = useCallback(async () => {
    if (!roomName.trim()) return;

    try {
      const roomHash = await getRoomHash(roomName);
      const kinder = await db.kinder.toArray();
      const vorlagen = await db.vorlagen.toArray();
      const aktivitaetsLog = await db.aktivitaetsLog.toArray();
      const anwesenheit = await db.anwesenheit.toArray();

      const payload = { kinder, vorlagen, aktivitaetsLog, anwesenheit };
      const currentContentHash = JSON.stringify(payload);

      // Avoid re-uploading identical database content
      if (currentContentHash === lastContentHashRef.current) {
        setStatus('connected');
        return;
      }

      const encryptedData = await encryptPayload(payload, roomName);

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomHash, encryptedData }),
      });

      if (res.status === 503) {
        setStatus('kv_missing');
        setErrorMsg('Vercel KV Datenbank ist noch nicht in Vercel verbunden.');
        return;
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Upload fehlgeschlagen');
      }

      lastContentHashRef.current = currentContentHash;
      setStatus('connected');
      setErrorMsg('');
    } catch (err: any) {
      console.error('Push to Cloud Sync failed:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Sync-Upload fehlgeschlagen');
    }
  }, [roomName]);

  // Download latest encrypted database from Cloud Storage & Merge
  const pullFromCloud = useCallback(async () => {
    if (!roomName.trim()) return;

    try {
      setStatus('syncing');
      const roomHash = await getRoomHash(roomName);
      const res = await fetch(`/api/sync?roomHash=${roomHash}`);

      if (res.status === 503) {
        setStatus('kv_missing');
        setErrorMsg('Vercel KV Datenbank ist noch nicht in Vercel verbunden.');
        return;
      }

      if (!res.ok) {
        setStatus('connected');
        return;
      }

      const { encryptedData } = await res.json();
      if (!encryptedData) {
        // No remote data yet -> upload local initial state
        await pushToCloud();
        return;
      }

      isApplyingRemoteSyncRef.current = true;
      try {
        const remoteData = await decryptPayload(encryptedData, roomName);
        const { kinder, vorlagen, aktivitaetsLog, anwesenheit } = remoteData;
        const remotePayload = { 
          kinder: kinder || [], 
          vorlagen: vorlagen || [], 
          aktivitaetsLog: aktivitaetsLog || [],
          anwesenheit: anwesenheit || []
        };
        const remoteContentHash = JSON.stringify(remotePayload);

        // Skip applying if remote database content is identical to our current local state
        if (remoteContentHash === lastContentHashRef.current) {
          setStatus('connected');
          return;
        }

        await datenZusammenfuehren(kinder || [], vorlagen || [], aktivitaetsLog || [], anwesenheit || []);
        
        // Re-read local DB to update our local content hash
        const freshKinder = await db.kinder.toArray();
        const freshVorlagen = await db.vorlagen.toArray();
        const freshLogs = await db.aktivitaetsLog.toArray();
        const freshAnw = await db.anwesenheit.toArray();
        lastContentHashRef.current = JSON.stringify({ 
          kinder: freshKinder, 
          vorlagen: freshVorlagen, 
          aktivitaetsLog: freshLogs,
          anwesenheit: freshAnw
        });

        setStatus('connected');
        setErrorMsg('');
      } catch (decryptErr) {
        console.warn('Decryption failed on remote cloud data. Overwriting remote state with fresh local data.', decryptErr);
        // Overwrite corrupted/incompatible remote payload with fresh local state
        lastContentHashRef.current = '';
        await pushToCloud();
      } finally {
        setTimeout(() => {
          isApplyingRemoteSyncRef.current = false;
        }, 500);
      }
    } catch (err: any) {
      console.error('Pull from Cloud Sync failed:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Sync-Abruf fehlgeschlagen');
    }
  }, [roomName, pushToCloud]);

  // Auto-sync effect: battery-friendly smart sync (15s interval + instant pull on screen unlock/touch)
  useEffect(() => {
    if (!autoSync || !roomName.trim()) {
      setStatus('disconnected');
      return;
    }

    // Pull immediately on startup
    pullFromCloud();

    let lastTouchPull = 0;
    const handleInstantPull = () => {
      const now = Date.now();
      if (now - lastTouchPull > 8000) {
        lastTouchPull = now;
        pullFromCloud();
      }
    };

    window.addEventListener('focus', handleInstantPull);
    window.addEventListener('visibilitychange', handleInstantPull);
    window.addEventListener('pointerdown', handleInstantPull);

    // Battery-optimized periodic check every 5 minutes (300,000 ms)
    const intervalId = setInterval(() => {
      pullFromCloud();
    }, 300000);

    return () => {
      window.removeEventListener('focus', handleInstantPull);
      window.removeEventListener('visibilitychange', handleInstantPull);
      window.removeEventListener('pointerdown', handleInstantPull);
      clearInterval(intervalId);
    };
  }, [roomName, autoSync, pullFromCloud]);

  // Hook into Dexie DB changes to automatically push changes to cloud
  useEffect(() => {
    const notifyChange = () => {
      if (isApplyingRemoteSyncRef.current || !autoSync || !roomName.trim()) return;

      if (debouncePushRef.current) {
        clearTimeout(debouncePushRef.current);
      }
      debouncePushRef.current = setTimeout(() => {
        pushToCloud();
      }, 400);
    };

    db.kinder.hook('creating', notifyChange);
    db.kinder.hook('updating', notifyChange);
    db.kinder.hook('deleting', notifyChange);
    db.vorlagen.hook('creating', notifyChange);
    db.vorlagen.hook('updating', notifyChange);
    db.vorlagen.hook('deleting', notifyChange);
    db.aktivitaetsLog.hook('creating', notifyChange);
    db.anwesenheit.hook('creating', notifyChange);
    db.anwesenheit.hook('updating', notifyChange);
    db.anwesenheit.hook('deleting', notifyChange);

    return () => {
      db.kinder.hook('creating').unsubscribe(notifyChange);
      db.kinder.hook('updating').unsubscribe(notifyChange);
      db.kinder.hook('deleting').unsubscribe(notifyChange);
      db.vorlagen.hook('creating').unsubscribe(notifyChange);
      db.vorlagen.hook('updating').unsubscribe(notifyChange);
      db.vorlagen.hook('deleting').unsubscribe(notifyChange);
      db.aktivitaetsLog.hook('creating').unsubscribe(notifyChange);
      db.anwesenheit.hook('creating').unsubscribe(notifyChange);
      db.anwesenheit.hook('updating').unsubscribe(notifyChange);
      db.anwesenheit.hook('deleting').unsubscribe(notifyChange);
    };
  }, [roomName, autoSync, pushToCloud]);

  const saveSettings = (newRoom: string, newAuto: boolean) => {
    const cleanRoom = newRoom.trim();
    localStorage.setItem('klisten_sync_room', cleanRoom);
    localStorage.setItem('klisten_sync_auto', String(newAuto));

    setRoomName(cleanRoom);
    setAutoSync(newAuto);
    lastContentHashRef.current = '';
  };

  const triggerPush = async () => {
    lastContentHashRef.current = '';
    await pushToCloud();
    showToast('Daten erfolgreich verschlüsselt in die Cloud hochgeladen!', 'success');
  };

  const triggerPull = async () => {
    lastContentHashRef.current = '';
    await pullFromCloud();
    showToast('Neueste Daten erfolgreich heruntergeladen und synchronisiert!', 'success');
  };

  const triggerOverwriteRemote = async () => {
    lastContentHashRef.current = '';
    await pushToCloud();
    showToast('Cloud-Stand erfolgreich mit den Daten dieses iPads überschrieben!', 'success');
  };

  return (
    <SyncContext.Provider
      value={{
        status,
        roomName,
        autoSync,
        errorMsg,
        saveSettings,
        triggerPush,
        triggerPull,
        triggerOverwriteRemote,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}
