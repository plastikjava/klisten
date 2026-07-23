'use client';

import React, { useRef, useState, useEffect } from 'react';
import { datenExportieren, datenImportieren } from '@/lib/db-operations';
import { useToast } from './Toast';
import { useSync } from './SyncProvider';

interface DatenSicherungProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'file' | 'cloud';

export default function DatenSicherung({ isOpen, onClose }: DatenSicherungProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    status,
    roomName: contextRoom,
    autoSync: contextAuto,
    errorMsg: contextError,
    saveSettings,
    triggerPush,
    triggerPull,
    triggerOverwriteRemote,
  } = useSync();

  // Tab control
  const [activeTab, setActiveTab] = useState<Tab>('file');

  // File backup states
  const [isImporting, setIsImporting] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [pendingJson, setPendingJson] = useState<string | null>(null);

  // Form states for sync settings
  const [roomNameInput, setRoomNameInput] = useState('');
  const [autoSyncInput, setAutoSyncInput] = useState(true);

  // Initialize input state from context
  useEffect(() => {
    if (isOpen) {
      setRoomNameInput(contextRoom);
      setAutoSyncInput(contextAuto);
    }
  }, [isOpen, contextRoom, contextAuto]);

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
    saveSettings(roomNameInput, autoSyncInput);
    showToast('Sync-Einstellungen gespeichert!', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-[#4A90D9] p-5 text-white flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            💾 Datensicherung & Cloud-Sync
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
          <div className="flex border-b border-slate-100 bg-slate-50/50 shrink-0">
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
              onClick={() => setActiveTab('cloud')}
              className={`flex-1 py-3 text-sm font-bold transition focus:outline-none ${
                activeTab === 'cloud'
                  ? 'border-b-2 border-purple-600 text-purple-600 bg-white'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ☁️ Ende-zu-Ende Cloud-Sync
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
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
                Da alle Kinderdaten lokal auf diesem Gerät gespeichert sind, 
                kannst du jederzeit ein manuelles Backup deiner Daten als JSON-Datei erstellen.
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
            // --- ENCRYPTED CLOUD SYNC TAB ---
            <div className="space-y-5">
              
              {/* Status Banner */}
              <div className="p-4 rounded-2xl border flex items-center justify-between gap-4 bg-slate-50 border-slate-200">
                <div className="flex items-center gap-3">
                  {status === 'connected' && <span className="text-2xl">🟢</span>}
                  {status === 'syncing' && <span className="text-2xl animate-spin">⏳</span>}
                  {status === 'disconnected' && <span className="text-2xl">⚪</span>}
                  {status === 'kv_missing' && <span className="text-2xl">🔴</span>}
                  {status === 'error' && <span className="text-2xl">⚠️</span>}

                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">
                      {status === 'connected' && 'Ende-zu-Ende Sync aktiv'}
                      {status === 'syncing' && 'Synchronisiere mit Cloud...'}
                      {status === 'disconnected' && 'Inaktiv (Bitte Codewort festlegen)'}
                      {status === 'kv_missing' && 'Vercel KV Datenbank fehlt'}
                      {status === 'error' && 'Sync-Fehler'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {status === 'connected' && 'Daten werden auf dem iPad verschlüsselt (AES-256).'}
                      {status === 'syncing' && 'Daten werden hoch- oder heruntergeladen...'}
                      {status === 'disconnected' && 'Gib unten dein Kita-Codewort ein.'}
                      {status === 'kv_missing' && 'Verbinde Upstash/KV unter Storage in Vercel.'}
                      {status === 'error' && (contextError || 'Fehler aufgetreten.')}
                    </p>
                  </div>
                </div>

                {status === 'connected' && (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={triggerPull}
                      className="py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs transition shadow-sm"
                    >
                      📥 Jetzt abrufen
                    </button>
                  </div>
                )}
              </div>

              {/* Vercel KV Missing Help Box */}
              {status === 'kv_missing' && (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl space-y-2 text-xs text-rose-800">
                  <h4 className="font-bold text-sm text-rose-900 flex items-center gap-1.5">
                    ⚙️ Anweisung: Vercel KV aktivieren (Einmalig 1 Minute)
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 leading-relaxed">
                    <li>Öffne dein Vercel Dashboard auf <strong>vercel.com</strong>.</li>
                    <li>Klicke auf dein Projekt <strong>Kita-Listen</strong>.</li>
                    <li>Gehe oben auf den Reiter <strong>Storage</strong>.</li>
                    <li>Klicke auf <strong>Create Database</strong> -&gt; wähle <strong>KV</strong> (oder Upstash Redis).</li>
                    <li>Klicke auf <strong>Connect to Project</strong>. Fertig!</li>
                  </ol>
                </div>
              )}

              {/* Form Settings */}
              <form onSubmit={handleSaveSyncSettings} className="space-y-4 bg-purple-50/40 p-5 rounded-2xl border border-purple-100/50">
                <h3 className="text-sm font-bold text-purple-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Cloud-Konfiguration</span>
                  <span className="text-[10px] bg-purple-200/60 text-purple-800 font-extrabold px-2 py-0.5 rounded-full">
                    🔒 AES-256 E2EE
                  </span>
                </h3>

                <div className="space-y-1.5">
                  <label htmlFor="p2pRoomInput" className="block text-xs font-bold text-slate-700">
                    Kita-Codewort (Passwort für Verschlüsselung) *
                  </label>
                  <input
                    type="text"
                    id="p2pRoomInput"
                    value={roomNameInput}
                    onChange={(e) => setRoomNameInput(e.target.value)}
                    placeholder="z.B. kita-sonnenschein-2026"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/30 transition font-mono"
                  />
                  <p className="text-[11px] text-slate-400">
                    Mit diesem Codewort werden alle Kinderdaten auf dem iPad unlesbar verschlüsselt. Alle Geräte müssen exakt dasselbe Codewort nutzen.
                  </p>
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
                    Automatischen Cloud-Sync beim App-Start & Änderungen aktivieren
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition focus:outline-none shadow-sm"
                >
                  💾 Codewort speichern & verbinden
                </button>
              </form>

              {/* Manual Cloud Actions */}
              {status === 'connected' && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={triggerPush}
                    className="text-xs text-purple-600 hover:text-purple-800 font-bold"
                  >
                    📤 Daten jetzt manuell in Cloud hochladen
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm('Der Stand in der Cloud wird komplett mit den Daten dieses Geräts überschrieben. Fortfahren?')) {
                        triggerOverwriteRemote();
                      }
                    }}
                    className="text-xs text-slate-400 hover:text-rose-600 font-semibold"
                  >
                    Reset Cloud
                  </button>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end shrink-0">
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
