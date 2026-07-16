'use client';

import React, { useState, useEffect } from 'react';
import { Listenvorlage } from '@/types';

interface VorlageEditFormularProps {
  isOpen: boolean;
  onClose: () => void;
  vorlage: Listenvorlage | null;
  onSave: (updatedVorlage: Listenvorlage) => void;
}

export default function VorlageEditFormular({
  isOpen,
  onClose,
  vorlage,
  onSave,
}: VorlageEditFormularProps) {
  const [name, setName] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && vorlage) {
      setName(vorlage.name);
      setBeschreibung(vorlage.beschreibung || '');
      setError('');
    }
  }, [isOpen, vorlage]);

  if (!isOpen || !vorlage) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Bitte gib einen Namen für die Vorlage an.');
      return;
    }

    const updatedVorlage: Listenvorlage = {
      ...vorlage,
      name: name.trim(),
      beschreibung: beschreibung.trim() || undefined,
    };

    onSave(updatedVorlage);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 select-none">
        
        {/* Header */}
        <div className="bg-purple-600 p-5 text-white flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2">
            ✏️ Vorlage bearbeiten
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
            
            <div className="space-y-1.5">
              <label htmlFor="editVorlagenName" className="block text-sm font-bold text-slate-700">
                Name der Vorlage *
              </label>
              <input
                type="text"
                id="editVorlagenName"
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
              <label htmlFor="editVorlagenBeschreibung" className="block text-sm font-bold text-slate-700">
                Beschreibung <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="editVorlagenBeschreibung"
                value={beschreibung}
                onChange={(e) => setBeschreibung(e.target.value)}
                placeholder="z.B. Für die wöchentliche Aktivität mit 6 Kindern..."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/30 transition resize-none"
              />
            </div>

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
