'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { Peer, DataConnection } from 'peerjs';
import { db } from '@/lib/db';
import { datenZusammenfuehren, datenUeberschreiben } from '@/lib/db-operations';
import { useToast } from './Toast';

type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface SyncContextType {
  status: SyncStatus;
  roomName: string;
  deviceRole: '1' | '2';
  autoSync: boolean;
  errorMsg: string;
  saveSettings: (roomName: string, role: '1' | '2', autoSync: boolean) => void;
  triggerSync: (type?: 'sync' | 'overwrite') => Promise<void>;
  disconnectP2P: () => void;
  connectP2P: () => void;
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
  const [deviceRole, setDeviceRole] = useState<'1' | '2'>('1');
  const [autoSync, setAutoSync] = useState(true);

  const [status, setStatus] = useState<SyncStatus>('disconnected');
  const [errorMsg, setErrorMsg] = useState('');

  const peerRef = useRef<Peer | null>(null);
  const connectionRef = useRef<DataConnection | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track status ref for async callbacks
  const statusRef = useRef<SyncStatus>(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Flag to prevent loop bounces when receiving data from remote peer
  const isReceivingRemoteSyncRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load configuration from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRoom = localStorage.getItem('klisten_sync_room') || '';
      const savedRole = (localStorage.getItem('klisten_sync_role') as '1' | '2') || '1';
      const savedAuto = localStorage.getItem('klisten_sync_auto') !== 'false';
      setRoomName(savedRoom);
      setDeviceRole(savedRole);
      setAutoSync(savedAuto);
    }
  }, []);

  const cleanup = useCallback(() => {
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (connectionRef.current) {
      connectionRef.current.close();
      connectionRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  // Send local payload to peer
  const sendPayload = useCallback(async (type: 'sync' | 'overwrite' = 'sync') => {
    if (!connectionRef.current || connectionRef.current.open === false) return;

    try {
      const kinder = await db.kinder.toArray();
      const vorlagen = await db.vorlagen.toArray();
      const aktivitaetsLog = await db.aktivitaetsLog.toArray();

      connectionRef.current.send({
        type,
        kinder,
        vorlagen,
        aktivitaetsLog,
      });
      console.log(`WebRTC payload sent (${type}): ${kinder.length} kinder, ${vorlagen.length} vorlagen.`);
    } catch (err) {
      console.error('Failed to send payload over WebRTC:', err);
    }
  }, []);

  // Setup WebRTC Data Connection
  const setupDataConnection = useCallback(
    (conn: DataConnection) => {
      conn.on('open', () => {
        console.log('PeerJS data connection opened!');
        if (retryTimerRef.current) {
          clearInterval(retryTimerRef.current);
          retryTimerRef.current = null;
        }
        connectionRef.current = conn;
        setStatus('connected');
        showToast('WLAN-Verbindung mit dem zweiten iPad hergestellt!', 'success');

        // Immediately trigger initial bidirectional sync on connection
        sendPayload('sync');
      });

      conn.on('data', async (incoming: any) => {
        if (!incoming || typeof incoming !== 'object') return;

        try {
          // Flag remote sync active so Dexie hooks don't bounce the packet back
          isReceivingRemoteSyncRef.current = true;
          const { type, kinder, vorlagen, aktivitaetsLog } = incoming;
          if (type === 'sync') {
            await datenZusammenfuehren(kinder || [], vorlagen || [], aktivitaetsLog || []);
          } else if (type === 'overwrite') {
            await datenUeberschreiben(kinder || [], vorlagen || [], aktivitaetsLog || []);
            showToast('Daten vom Master-iPad übernommen!', 'success');
          }
        } catch (err) {
          console.error('Failed to process incoming WebRTC sync payload:', err);
        } finally {
          // Reset remote sync flag after write completes
          setTimeout(() => {
            isReceivingRemoteSyncRef.current = false;
          }, 300);
        }
      });

      conn.on('close', () => {
        console.log('PeerJS data connection closed');
        connectionRef.current = null;
        setStatus('disconnected');
      });

      conn.on('error', (err) => {
        console.error('PeerJS connection error:', err);
        connectionRef.current = null;
        setStatus('disconnected');
      });
    },
    [sendPayload, showToast]
  );

  // Initialize P2P Connection
  const connectP2P = useCallback(async () => {
    if (!roomName.trim()) return;

    cleanup();
    setStatus('connecting');
    setErrorMsg('');

    const cleanRoom = roomName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const myPeerId = `klisten-${cleanRoom}-${deviceRole}`;
    const targetPeerId = `klisten-${cleanRoom}-${deviceRole === '1' ? '2' : '1'}`;

    try {
      const { Peer } = await import('peerjs');
      const newPeer = new Peer(myPeerId, { debug: 1 });

      newPeer.on('open', (id) => {
        console.log('PeerJS registered with ID:', id);

        // Attempt to connect to the target peer periodically until connected
        retryTimerRef.current = setInterval(() => {
          if (newPeer.destroyed || connectionRef.current?.open) return;
          console.log(`Searching for target peer: ${targetPeerId}...`);
          const conn = newPeer.connect(targetPeerId, { serialization: 'json' });
          setupDataConnection(conn);
        }, 4000);
      });

      newPeer.on('connection', (conn) => {
        console.log('Incoming PeerJS connection accepted!');
        setupDataConnection(conn);
      });

      newPeer.on('error', (err) => {
        console.error('PeerJS global error:', err);
        setErrorMsg('Signaling-Server nicht erreichbar.');
        setStatus('error');
        cleanup();
      });

      peerRef.current = newPeer;
    } catch (err) {
      console.error('PeerJS initialization error:', err);
      setErrorMsg('Sync-Modul konnte nicht geladen werden.');
      setStatus('error');
    }
  }, [roomName, deviceRole, cleanup, setupDataConnection]);

  // Automatically connect on mount or when settings change
  useEffect(() => {
    if (autoSync && roomName.trim()) {
      connectP2P();
    } else {
      cleanup();
    }
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, deviceRole, autoSync]);

  // Hook into Dexie DB changes to broadcast edits in real-time when connected
  useEffect(() => {
    const notifyChange = () => {
      // Ignore DB writes caused by incoming remote sync packets
      if (isReceivingRemoteSyncRef.current) return;

      // Debounce and defer execution until AFTER local DB transaction commits
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        if (statusRef.current === 'connected' && connectionRef.current?.open) {
          sendPayload('sync');
        }
      }, 400);
    };

    db.kinder.hook('creating', notifyChange);
    db.kinder.hook('updating', notifyChange);
    db.kinder.hook('deleting', notifyChange);
    db.vorlagen.hook('creating', notifyChange);
    db.vorlagen.hook('updating', notifyChange);
    db.vorlagen.hook('deleting', notifyChange);
    db.aktivitaetsLog.hook('creating', notifyChange);

    return () => {
      db.kinder.hook('creating').unsubscribe(notifyChange);
      db.kinder.hook('updating').unsubscribe(notifyChange);
      db.kinder.hook('deleting').unsubscribe(notifyChange);
      db.vorlagen.hook('creating').unsubscribe(notifyChange);
      db.vorlagen.hook('updating').unsubscribe(notifyChange);
      db.vorlagen.hook('deleting').unsubscribe(notifyChange);
      db.aktivitaetsLog.hook('creating').unsubscribe(notifyChange);
    };
  }, [sendPayload]);

  const saveSettings = (newRoom: string, newRole: '1' | '2', newAuto: boolean) => {
    localStorage.setItem('klisten_sync_room', newRoom.trim());
    localStorage.setItem('klisten_sync_role', newRole);
    localStorage.setItem('klisten_sync_auto', String(newAuto));

    setRoomName(newRoom.trim());
    setDeviceRole(newRole);
    setAutoSync(newAuto);
  };

  const triggerSync = async (type: 'sync' | 'overwrite' = 'sync') => {
    if (status !== 'connected') {
      throw new Error('Keine aktive WLAN-Verbindung vorhanden.');
    }
    await sendPayload(type);
  };

  return (
    <SyncContext.Provider
      value={{
        status,
        roomName,
        deviceRole,
        autoSync,
        errorMsg,
        saveSettings,
        triggerSync,
        disconnectP2P: cleanup,
        connectP2P,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}
