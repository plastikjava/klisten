'use client';

import React, { useRef, useState, useEffect } from 'react';
import { datenExportieren, datenImportieren, datenZusammenfuehren, datenUeberschreiben } from '@/lib/db-operations';
import { db } from '@/lib/db';
import { useToast } from './Toast';
import type { Peer, DataConnection } from 'peerjs';

interface DatenSicherungProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'file' | 'p2p';

export default function DatenSicherung({ isOpen, onClose }: DatenSicherungProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Tab control
  const [activeTab, setActiveTab] = useState<Tab>('file');

  // File backup states
  const [isImporting, setIsImporting] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [pendingJson, setPendingJson] = useState<string | null>(null);

  // P2P WebRTC states
  const [roomName, setRoomName] = useState('');
  const [deviceRole, setDeviceRole] = useState<'1' | '2'>('1');
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const connectIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved sync config from localstorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRoom = localStorage.getItem('klisten_sync_room') || '';
      const savedRole = localStorage.getItem('klisten_sync_role') as '1' | '2' || '1';
      setRoomName(savedRoom);
      setDeviceRole(savedRole);
    }
  }, []);

  // Cleanup peer connection on unmount or close
  useEffect(() => {
    return () => {
      cleanupP2P();
    };
  }, []);

  const cleanupP2P = () => {
    if (connectIntervalRef.current) {
      clearInterval(connectIntervalRef.current);
      connectIntervalRef.current = null;
    }
    if (connection) {
      connection.close();
      setConnection(null);
    }
    if (peer) {
      peer.destroy();
      setPeer(null);
    }
    setConnectionStatus('disconnected');
  };

  // --- FILE BACKUP HANDLERS ---
  const handleExport = async () => {
    try {
      const jsonString = await datenExportieren();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `kita-listen-backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Daten erfolgreich als JSON exportiert!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Export failed.', 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        setPendingJson(result);
        setConfirmOverwrite(true);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeImport = async () => {
    if (!pendingJson) return;
    setIsImporting(true);
    try {
      await datenImportieren(pendingJson);
      showToast('Daten erfolgreich importiert und überschrieben!', 'success');
      setConfirmOverwrite(false);
      setPendingJson(null);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      showToast(error.message || 'Import fehlgeschlagen.', 'error');
      setConfirmOverwrite(false);
      setPendingJson(null);
    } finally {
      setIsImporting(false);
    }
  };

  // --- P2P WLAN SYNC HANDLERS ---
  const handleStartP2P = async () => {
    if (!roomName.trim()) {
      setErrorMsg('Bitte gib ein Kita-Codewort an.');
      setConnectionStatus('error');
      return;
    }

    cleanupP2P();
    setConnectionStatus('connecting');
    setErrorMsg('');

    // Save configuration locally
    localStorage.setItem('klisten_sync_room', roomName.trim());
    localStorage.setItem('klisten_sync_role', deviceRole);

    const cleanRoom = roomName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const myPeerId = `klisten-${cleanRoom}-${deviceRole}`;
    const targetPeerId = `klisten-${cleanRoom}-${deviceRole === '1' ? '2' : '1'}`;

    try {
      // Dynamic import of PeerJS to bypass SSR build checks
      const { Peer } = await import('peerjs');
      
      const newPeer = new Peer(myPeerId, {
        debug: 1, // Only print warnings/errors
      });

      newPeer.on('open', (id) => {
        console.log('PeerJS registration successful. My Peer ID:', id);
        
        // Loop connecting to the target peer ID until connected
        connectIntervalRef.current = setInterval(() => {
          if (newPeer.destroyed || connectionStatus === 'connected') return;
          console.log(`Connecting to peer: ${targetPeerId}...`);
          const conn = newPeer.connect(targetPeerId, {
            serialization: 'json'
          });
          setupConnection(conn);
        }, 3000);
      });

      newPeer.on('connection', (conn) => {
        console.log('Incoming connection received from target peer!');
        setupConnection(conn);
      });

      newPeer.on('error', (err) => {
        console.error('PeerJS global error:', err);
        setErrorMsg('Verbindungsservice nicht erreichbar. Bitte überprüfe dein Internet.');
        setConnectionStatus('error');
        cleanupP2P();
      });

      setPeer(newPeer);
    } catch (err) {
      console.error('Failed to initialize PeerJS:', err);
      setErrorMsg('Konnte Synchronisationsmodul nicht laden.');
      setConnectionStatus('error');
    }
  };

  const setupConnection = (conn: DataConnection) => {
    conn.on('open', () => {
      console.log('Data channel open with target peer!');
      if (connectIntervalRef.current) {
        clearInterval(connectIntervalRef.current);
        connectIntervalRef.current = null;
      }
      setConnection(conn);
      setConnectionStatus('connected');
      showToast('WLAN-Verbindung mit anderem iPad hergestellt!', 'success');
    });

    conn.on('data', async (incomingData: any) => {
      console.log('Data package received over WebRTC channel');
      if (!incomingData || typeof incomingData !== 'object') return;

      setIsSyncing(true);
      try {
        const { type, kinder, vorlagen, aktivitaetsLog } = incomingData;
        if (type === 'sync') {
          await datenZusammenfuehren(kinder || [], vorlagen || [], aktivitaetsLog || []);
          showToast('Daten erfolgreich zusammengeführt und aktualisiert!', 'success');
        } else if (type === 'overwrite') {
          await datenUeberschreiben(kinder || [], vorlagen || [], aktivitaetsLog || []);
          showToast('Daten komplett mit Master-iPad überschrieben!', 'success');
        }
        
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } catch (err: any) {
        showToast('Fehler beim Verarbeiten der empfangenen Syncdaten.', 'error');
      } finally {
        setIsSyncing(false);
      }
    });

    conn.on('close', () => {
      console.log('Data connection closed by peer');
      showToast('Verbindung zum anderen iPad getrennt.', 'info');
      setConnectionStatus('disconnected');
      setConnection(null);
    });

    conn.on('error', (err) => {
      console.error('Connection error:', err);
      showToast('Verbindungsfehler aufgetreten.', 'error');
      setConnectionStatus('disconnected');
      setConnection(null);
    });
  };

  const triggerSync = async (type: 'sync' | 'overwrite') => {
    if (!connection || connectionStatus !== 'connected') {
      showToast('Keine aktive Verbindung vorhanden.', 'error');
      return;
    }

    setIsSyncing(true);
    try {
      const kinder = await db.kinder.toArray();
      const vorlagen = await db.vorlagen.toArray();
      const aktivitaetsLog = await db.aktivitaetsLog.toArray();

      connection.send({
        type,
        kinder,
        vorlagen,
        aktivitaetsLog
      });

      showToast(
        type === 'sync' 
          ? 'Abgleich gesendet! Warte auf Bestätigung...' 
          : 'Überschreiben gesendet! Warte auf Bestätigung...', 
        'info'
      );
    } catch (err) {
      showToast('Fehler beim Auslesen oder Senden der Daten.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-[#4A90D9] p-6 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            💾 Datensicherung & Sync
          </h2>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white text-2xl font-bold focus:outline-none"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        {!confirmOverwrite && (
          <div className="flex border-b border-slate-100 bg-slate-50/50">
            <button
              onClick={() => setActiveTab('file')}
              className={`flex-1 py-3 text-sm font-bold transition focus:outline-none ${
                activeTab === 'file'
                  ? 'border-b-2 border-[#4A90D9] text-[#4A90D9] bg-white'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              📄 Dateisicherung
            </button>
            <button
              onClick={() => setActiveTab('p2p')}
              className={`flex-1 py-3 text-sm font-bold transition focus:outline-none ${
                activeTab === 'p2p'
                  ? 'border-b-2 border-purple-600 text-purple-600 bg-white'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              🔄 WLAN-Abgleich (P2P)
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {confirmOverwrite ? (
            // Overwrite Danger Box (For file import)
            <div className="bg-rose-50 border border-rose-200 p-5 rounded-xl space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">⚠️</span>
                <div>
                  <h3 className="font-bold text-rose-800 text-lg">Achtung: Bestehende Daten überschreiben?</h3>
                  <p className="text-rose-700 text-sm mt-1 leading-relaxed">
                    Durch den Import dieses Backups werden <strong>alle derzeit in der App gespeicherten Kinderdaten unwiderruflich gelöscht</strong> und durch den Inhalt des Backups ersetzt.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => { setConfirmOverwrite(false); setPendingJson(null); }}
                  disabled={isImporting}
                  className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition text-sm disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={executeImport}
                  disabled={isImporting}
                  className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm transition text-sm disabled:opacity-50"
                >
                  {isImporting ? 'Importiert...' : 'Ja, überschreiben'}
                </button>
              </div>
            </div>
          ) : activeTab === 'file' ? (
            // --- FILE BACKUP TAB ---
            <>
              <p className="text-slate-600 text-sm leading-relaxed">
                Da alle Kinderdaten ausschließlich lokal auf diesem Gerät gespeichert sind (kein Server, keine Cloud), 
                solltest du regelmäßig ein Backup deiner Daten erstellen.
              </p>

              <div className="bg-[#FAFAF5] p-5 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-800">1. Daten sichern (Export)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Lade alle aktuellen Kinderdaten als JSON-Datei herunter.</p>
                </div>
                <button
                  onClick={handleExport}
                  className="py-3 px-5 bg-[#4A90D9] hover:bg-[#357ABD] text-white font-bold rounded-xl shadow-sm text-sm transition shrink-0"
                >
                  Backup erstellen
                </button>
              </div>

              <div className="bg-[#FAFAF5] p-5 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-800">2. Daten wiederherstellen (Import)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Lade ein zuvor erstelltes Backup hoch.</p>
                </div>
                <div>
                  <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="py-3 px-5 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-xl shadow-sm text-sm transition shrink-0 w-full"
                  >
                    Backup einspielen
                  </button>
                </div>
              </div>
            </>
          ) : (
            // --- P2P WLAN SYNC TAB ---
            <div className="space-y-4">
              <p className="text-slate-600 text-sm leading-relaxed">
                Gleiche Daten direkt über euer WLAN zwischen zwei iPads ab. Daten fließen direkt verschlüsselt von Gerät zu Gerät.
              </p>

              {/* Configurations */}
              {connectionStatus === 'disconnected' ? (
                <div className="space-y-3 bg-purple-50/40 p-4 rounded-2xl border border-purple-100/50">
                  <div className="space-y-1">
                    <label htmlFor="p2pRoom" className="block text-xs font-bold text-purple-700 uppercase">
                      Kita-Codewort (eindeutiger Schlüssel)
                    </label>
                    <input
                      type="text"
                      id="p2pRoom"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="z.B. kita-marienkaefer-sync"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/30 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="block text-xs font-bold text-purple-700 uppercase">
                      Dieses iPad ist:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDeviceRole('1')}
                        className={`p-2 rounded-lg text-xs font-bold transition focus:outline-none border ${
                          deviceRole === '1'
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Gerät 1
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeviceRole('2')}
                        className={`p-2 rounded-lg text-xs font-bold transition focus:outline-none border ${
                          deviceRole === '2'
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Gerät 2
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleStartP2P}
                    className="w-full mt-2 py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition focus:outline-none"
                  >
                    🔄 Verbindung starten
                  </button>
                </div>
              ) : (
                /* Active status panel */
                <div className="p-4 rounded-2xl border flex flex-col items-center text-center space-y-3 bg-white border-slate-100 shadow-sm">
                  
                  {connectionStatus === 'connecting' && (
                    <>
                      <span className="text-3xl animate-bounce">⏳</span>
                      <h4 className="font-bold text-slate-800 text-sm">Warte auf das zweite iPad...</h4>
                      <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                        Stelle sicher, dass auf dem anderen iPad ebenfalls dieser Sync-Tab geöffnet ist, das gleiche Codewort verwendet wird und die andere Rolle ausgewählt ist.
                      </p>
                    </>
                  )}

                  {connectionStatus === 'connected' && (
                    <>
                      <span className="text-3xl">🟢</span>
                      <h4 className="font-bold text-emerald-800 text-sm">Verbunden mit anderem iPad!</h4>
                      
                      <div className="w-full grid grid-cols-1 gap-2 pt-2">
                        <button
                          onClick={() => triggerSync('sync')}
                          disabled={isSyncing}
                          className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition focus:outline-none disabled:opacity-50"
                        >
                          🔄 Daten abgleichen (Zusammenführen)
                        </button>
                        
                        <button
                          onClick={() => {
                            if (window.confirm('Das andere iPad wird komplett mit den Daten dieses Geräts überschrieben. Fortfahren?')) {
                              triggerSync('overwrite');
                            }
                          }}
                          disabled={isSyncing}
                          className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold rounded-xl text-sm transition focus:outline-none disabled:opacity-50"
                        >
                          📤 Anderes iPad überschreiben (Master)
                        </button>
                      </div>
                    </>
                  )}

                  {connectionStatus === 'error' && (
                    <>
                      <span className="text-3xl">❌</span>
                      <h4 className="font-bold text-rose-800 text-sm">Verbindungsfehler</h4>
                      <p className="text-xs text-rose-600 max-w-xs">{errorMsg}</p>
                    </>
                  )}

                  <button
                    onClick={cleanupP2P}
                    className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-xs font-bold transition focus:outline-none"
                  >
                    Trennen / Zurück
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={() => { cleanupP2P(); onClose(); }}
            disabled={isImporting || isSyncing}
            className="py-2 px-5 text-slate-500 hover:text-slate-700 font-semibold rounded-lg text-sm"
          >
            Schließen
          </button>
        </div>

      </div>
    </div>
  );
}
