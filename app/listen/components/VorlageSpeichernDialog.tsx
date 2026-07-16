'use client';

import React, { useState, useEffect } from 'react';
import { Listenvorlage } from '@/types';

interface VorlageSpeichernDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, updateExisting: boolean, beschreibung?: string) => void;
  aktiveVorlage: Listenvorlage | null;
}

export default function VorlageSpeichernDialog({
  isOpen,
  onClose,
  onSave,
  aktiveVorlage,
}: VorlageSpeichernDialogProps) {
  const [name, setName] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [updateMode, setUpdateMode] = useState<'update' | 'new'>('new');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (aktiveVorlage) {
        setName('');
        setBeschreibung('');
        setUpdateMode('update');
      } else {
        setName('');
        setBeschreibung('');
        setUpdateMode('new');
      }
      setError('');
    }
  }, [isOpen, aktiveVorlage]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (updateMode === 'new' && !name.trim()) {
      setError('Bitte gib einen Namen für die Vorlage an.');
      return;
    }

    onSave(
      updateMode === 'update' && aktiveVorlage ? aktiveVorlage.name : name.trim(),
      updateMode === 'update',
      updateMode === 'update' && aktiveVorlage ? aktiveVorlage.beschreibung : (beschreibung.trim() || undefined)
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 select-none">
        
        {/* Header */}
        <div className="bg-purple-600 p-5 text-white flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2">
            📚 Vorlage speichern
          </h2>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white text-2xl font-bold focus:outline-none"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            
            {/* Update existing template option if one is loaded */}
            {aktiveVorlage && (
              <div className="space-y-2 border-b border-slate-100 pb-3">
                <label className="block text-sm font-bold text-slate-700">Speichertyp wählen</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUpdateMode('update')}
                    className={`p-3 rounded-xl border text-sm font-bold transition focus:outline-none ${
                      updateMode === 'update'
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    🔄 '{aktiveVorlage.name}' überschreiben
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateMode('new')}
                    className={`p-3 rounded-xl border text-sm font-bold transition focus:outline-none ${
                      updateMode === 'new'
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    ➕ Als neue Vorlage
                  </button>
                </div>
              </div>
            )}

            {/* Inputs (Only relevant for New Mode or when creating from scratch) */}
            {updateMode === 'new' ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="vorlagenName" className="block text-sm font-bold text-slate-700">
                    Name der Vorlage *
                  </label>
                  <input
                    type="text"
                    id="vorlagenName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="z.B. Vorlese-Oma, Waldtag, Turnhalle..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-purple-600/30 transition"
                    autoComplete="off"
                    autoFocus
                  />
                  {error && (
                    <p className="text-rose-500 text-xs font-semibold">{error}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="vorlagenBeschreibung" className="block text-sm font-bold text-slate-700">
                    Beschreibung <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    id="vorlagenBeschreibung"
                    value={beschreibung}
                    onChange={(e) => setBeschreibung(e.target.value)}
                    placeholder="z.B. Für die wöchentliche Aktivität mit 6 Kindern..."
                    rows={2}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/30 transition resize-none"
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/50 leading-relaxed">
                Dies aktualisiert die bestehende Vorlage <strong>'{aktiveVorlage?.name}'</strong> mit deinen aktuellen Filterkriterien.
              </p>
            )}

          </div>

          {/* Footer */}
          <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition text-sm focus:outline-none"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="py-2.5 px-5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm transition text-sm focus:outline-none"
            >
              Speichern
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
