'use client';

import React, { useRef, useState, useEffect } from 'react';
import { datenExportieren, datenImportieren } from '@/lib/db-operations';
import { useToast } from './Toast';
import { useSync } from './SyncProvider';

interface DatenSicherungProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'file' | 'p2p';

export default function DatenSicherung({ isOpen, onClose }: DatenSicherungProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    status,
    roomName: contextRoom,
    deviceRole: contextRole,
    autoSync: contextAuto,
    errorMsg: contextError,
    saveSettings,
    triggerSync,
    connectP2P,
  } = useSync();

  // Tab control
  const [activeTab, setActiveTab] = useState<Tab>('file');

  // File backup states
  const [isImporting, setIsImporting] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [pendingJson, setPendingJson] = useState<string | null>(null);

  // Form states for sync settings
  const [roomNameInput, setRoomNameInput] = useState('');
  const [deviceRoleInput, setDeviceRoleInput] = useState<'1' | '2'>('1');
  const [autoSyncInput, setAutoSyncInput] = useState(true);

  // Initialize input state from context
  useEffect(() => {
    if (isOpen) {
      setRoomNameInput(contextRoom);
      setDeviceRoleInput(contextRole);
      setAutoSyncInput(contextAuto);
    }
  }, [isOpen, contextRoom, contextRole, contextAuto]);

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
      showToast(error.message || 'Export fehlgeschlagen.', 'error');
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
      showToast('Daten erfolgreich importiert!', 'success');
      setConfirmOverwrite(false);
      setPendingJson(null);
    } catch (error: any) {
      showToast(error.message || 'Import fehlgeschlagen.', 'error');
      setConfirmOverwrite(false);
      setPendingJson(null);
    } finally {
      setIsImporting(false);
    }
  };

  // --- SYNC SETTINGS HANDLERS ---
  const handleSaveSyncSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNameInput.trim()) {
      showToast('Bitte gib ein Kita-Codewort an.', 'error');
      return;
    }
    saveSettings(roomNameInput, deviceRoleInput, autoSyncInput);
    showToast('Sync-Einstellungen gespeichert! Verbindung wird hergestellt...', 'success');
    connectP2P();
  };

  const handleTriggerSyncNow = async (type: 'sync' | 'overwrite') => {
    try {
      await triggerSync(type);
      showToast(
        type === 'sync'
          ? 'Daten erfolgreich mit dem anderen iPad abgeglichen!'
          : 'Anderes iPad erfolgreich überschrieben!',
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Fehler beim Abgleich.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-[#4A90D9] p-6 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            💾 Datensicherung & iPad-Sync
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
              🔄 Automatische iPad-Synchronisation
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
            // --- AUTOMATIC P2P WLAN SYNC TAB ---
            <div className="space-y-5">
              
              {/* Connection Status Box */}
              <div className="p-4 rounded-2xl border flex items-center justify-between gap-4 bg-slate-50 border-slate-200">
                <div className="flex items-center gap-3">
                  {status === 'connected' && <span className="text-2xl">🟢</span>}
                  {status === 'connecting' && <span className="text-2xl animate-spin">⏳</span>}
                  {status === 'disconnected' && <span className="text-2xl">⚪</span>}
                  {status === 'error' && <span className="text-2xl">🔴</span>}

                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">
                      {status === 'connected' && 'Verbunden mit anderem iPad!'}
                      {status === 'connecting' && 'Verbindung wird aufgebaut...'}
                      {status === 'disconnected' && 'Nicht verbunden'}
                      {status === 'error' && 'Verbindungsfehler'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {status === 'connected' && 'Änderungen werden in Echtzeit synchronisiert.'}
                      {status === 'connecting' && 'Sucht das zweite iPad im WLAN...'}
                      {status === 'disconnected' && 'Bitte erstelle Einstellungen unten.'}
                      {status === 'error' && (contextError || 'Signaling-Server nicht erreichbar.')}
                    </p>
                  </div>
                </div>

                {status === 'connected' && (
                  <button
                    onClick={() => handleTriggerSyncNow('sync')}
                    className="py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition shrink-0 shadow-sm"
                  >
                    🔄 Jetzt abgleichen
                  </button>
                )}
              </div>

              {/* Form Settings */}
              <form onSubmit={handleSaveSyncSettings} className="space-y-4 bg-purple-50/40 p-5 rounded-2xl border border-purple-100/50">
                <h3 className="text-sm font-bold text-purple-900 uppercase tracking-wider">
                  Sync-Konfiguration
                </h3>

                <div className="space-y-1.5">
                  <label htmlFor="p2pRoomInput" className="block text-xs font-bold text-slate-700">
                    Kita-Codewort (eindeutiger Schlüssel) *
                  </label>
                  <input
                    type="text"
                    id="p2pRoomInput"
                    value={roomNameInput}
                    onChange={(e) => setRoomNameInput(e.target.value)}
                    placeholder="z.B. kita-sonnenschein-2026"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/30 transition"
                  />
                  <p className="text-[11px] text-slate-400">Beide iPads müssen exakt dasselbe Codewort eingetragen haben.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Dieses iPad ist:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeviceRoleInput('1')}
                      className={`p-2.5 rounded-xl text-xs font-bold transition focus:outline-none border ${
                        deviceRoleInput === '1'
                          ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Gerät 1
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeviceRoleInput('2')}
                      className={`p-2.5 rounded-xl text-xs font-bold transition focus:outline-none border ${
                        deviceRoleInput === '2'
                          ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Gerät 2
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="autoSyncInput"
                    checked={autoSyncInput}
                    onChange={(e) => setAutoSyncInput(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500/50 border-slate-300"
                  />
                  <label htmlFor="autoSyncInput" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Automatischen WLAN-Sync im Hintergrund aktivieren
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition focus:outline-none shadow-sm"
                >
                  💾 Einstellungen speichern & verbinden
                </button>
              </form>

              {/* Master Overwrite Options */}
              {status === 'connected' && (
                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => {
                      if (window.confirm('Das andere iPad wird komplett mit den Daten dieses Geräts überschrieben. Fortfahren?')) {
                        handleTriggerSyncNow('overwrite');
                      }
                    }}
                    className="text-xs text-slate-500 hover:text-rose-600 font-semibold"
                  >
                    📤 Master-Reset: Das andere iPad komplett überschreiben
                  </button>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            disabled={isImporting}
            className="py-2 px-5 text-slate-500 hover:text-slate-700 font-semibold rounded-lg text-sm"
          >
            Schließen
          </button>
        </div>

      </div>
    </div>
  );
}
