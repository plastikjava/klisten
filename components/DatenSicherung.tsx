'use client';

import React, { useRef, useState } from 'react';
import { datenExportieren, datenImportieren } from '@/lib/db-operations';
import { useToast } from './Toast';

interface DatenSicherungProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DatenSicherung({ isOpen, onClose }: DatenSicherungProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [pendingJson, setPendingJson] = useState<string | null>(null);

  if (!isOpen) return null;

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
    
    // Reset file input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const executeImport = async () => {
    if (!pendingJson) return;
    
    setIsImporting(true);
    try {
      await datenImportieren(pendingJson);
      showToast('Daten erfolgreich importiert und überschrieben!', 'success');
      setConfirmOverwrite(false);
      setPendingJson(null);
      
      // Reload the page to refresh all active DB hooks in client components
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      showToast(error.message || 'Import fehlgeschlagen. Ungültiges Dateiformat.', 'error');
      setConfirmOverwrite(false);
      setPendingJson(null);
    } finally {
      setIsImporting(false);
    }
  };

  const cancelImport = () => {
    setConfirmOverwrite(false);
    setPendingJson(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-[#4A90D9] p-6 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            💾 Datensicherung
          </h2>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white text-2xl font-bold focus:outline-none"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {!confirmOverwrite ? (
            <>
              <p className="text-slate-600 text-sm md:text-base leading-relaxed">
                Da alle Kinderdaten ausschließlich lokal auf diesem Gerät gespeichert sind (kein Server, keine Cloud), 
                solltest du regelmäßig ein Backup deiner Daten erstellen.
              </p>

              {/* Export Area */}
              <div className="bg-[#FAFAF5] p-5 rounded-xl border border-slate-200/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
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

              {/* Import Area */}
              <div className="bg-[#FAFAF5] p-5 rounded-xl border border-slate-200/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            // Danger Confirmation Box
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
                  onClick={cancelImport}
                  disabled={isImporting}
                  className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition text-sm disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={executeImport}
                  disabled={isImporting}
                  className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm transition text-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isImporting ? 'Importiert...' : 'Ja, überschreiben'}
                </button>
              </div>
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
