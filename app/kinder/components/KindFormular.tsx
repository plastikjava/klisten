'use client';

import React, { useState, useEffect } from 'react';
import { Kind } from '@/types';

interface KindFormularProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (kind: Omit<Kind, 'id'>) => void;
  kind?: Kind; // Present only if editing
  gruppen: string[]; // List of existing group names
}

export default function KindFormular({ isOpen, onClose, onSave, kind, gruppen }: KindFormularProps) {
  const [vorname, setVorname] = useState('');
  const [geburtsdatum, setGeburtsdatum] = useState('');
  const [gruppe, setGruppe] = useState('');
  const [neueGruppe, setNeueGruppe] = useState('');
  const [isNeueGruppeSelected, setIsNeueGruppeSelected] = useState(false);
  const [besonderheiten, setBesonderheiten] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Reset/populate form when dialog opens/closes or kind changes
  useEffect(() => {
    if (isOpen) {
      if (kind) {
        setVorname(kind.vorname);
        setGeburtsdatum(kind.geburtsdatum);
        setBesonderheiten(kind.besonderheiten || '');
        
        // If the group is already in existing groups list
        if (gruppen.includes(kind.gruppe)) {
          setGruppe(kind.gruppe);
          setIsNeueGruppeSelected(false);
          setNeueGruppe('');
        } else {
          // If group is not in list (or empty list), treat as selected/prefilled
          setGruppe(kind.gruppe);
          setIsNeueGruppeSelected(false);
          setNeueGruppe('');
        }
      } else {
        // Clear form for adding
        setVorname('');
        setGeburtsdatum('');
        setGruppe(gruppen[0] || '');
        setNeueGruppe('');
        setIsNeueGruppeSelected(gruppen.length === 0);
        setBesonderheiten('');
      }
      setErrors({});
    }
  }, [isOpen, kind, gruppen]);

  if (!isOpen) return null;

  const handleGruppeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__NEW__') {
      setIsNeueGruppeSelected(true);
      setGruppe('');
    } else {
      setIsNeueGruppeSelected(false);
      setGruppe(val);
      setNeueGruppe('');
    }
  };

  const validate = (): boolean => {
    const tempErrors: { [key: string]: string } = {};
    
    if (!vorname.trim()) {
      tempErrors.vorname = 'Vorname ist erforderlich.';
    }
    
    if (!geburtsdatum) {
      tempErrors.geburtsdatum = 'Geburtsdatum ist erforderlich.';
    } else {
      const selectedDate = new Date(geburtsdatum);
      const today = new Date();
      // Remove time portions for comparison
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate > today) {
        tempErrors.geburtsdatum = 'Das Geburtsdatum darf nicht in der Zukunft liegen.';
      }
    }
    
    const finalGruppe = isNeueGruppeSelected ? neueGruppe.trim() : gruppe;
    if (!finalGruppe) {
      tempErrors.gruppe = 'Gruppe ist erforderlich.';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const finalGruppe = isNeueGruppeSelected ? neueGruppe.trim() : gruppe;

    onSave({
      vorname: vorname.trim(),
      geburtsdatum,
      gruppe: finalGruppe,
      besonderheiten: besonderheiten.trim() || undefined,
      letzteAktivitaetAm: kind?.letzteAktivitaetAm // Preserve activity date if editing
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#4A90D9] p-6 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {kind ? '📝 Kind bearbeiten' : '➕ Kind hinzufügen'}
          </h2>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white text-2xl font-bold focus:outline-none"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        {/* Body (Form) */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
            
            {/* Vorname */}
            <div className="space-y-1.5">
              <label htmlFor="vorname" className="block text-sm font-bold text-slate-700">
                Vorname *
              </label>
              <input
                type="text"
                id="vorname"
                value={vorname}
                onChange={(e) => setVorname(e.target.value)}
                placeholder="Vorname des Kindes"
                className={`w-full p-3.5 bg-slate-50 border rounded-xl text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/50 transition ${
                  errors.vorname ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200'
                }`}
                autoComplete="off"
              />
              {errors.vorname && (
                <p className="text-rose-500 text-xs font-semibold">{errors.vorname}</p>
              )}
            </div>

            {/* Geburtsdatum */}
            <div className="space-y-1.5">
              <label htmlFor="geburtsdatum" className="block text-sm font-bold text-slate-700">
                Geburtsdatum *
              </label>
              <input
                type="date"
                id="geburtsdatum"
                value={geburtsdatum}
                onChange={(e) => setGeburtsdatum(e.target.value)}
                className={`w-full p-3.5 bg-slate-50 border rounded-xl text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/50 transition ${
                  errors.geburtsdatum ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200'
                }`}
              />
              {errors.geburtsdatum && (
                <p className="text-rose-500 text-xs font-semibold">{errors.geburtsdatum}</p>
              )}
            </div>

            {/* Gruppe */}
            <div className="space-y-1.5">
              <label htmlFor="gruppe" className="block text-sm font-bold text-slate-700">
                Gruppe *
              </label>
              
              {!isNeueGruppeSelected ? (
                <select
                  id="gruppe"
                  value={gruppe}
                  onChange={handleGruppeChange}
                  className={`w-full p-3.5 bg-slate-50 border rounded-xl text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/50 transition ${
                    errors.gruppe ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200'
                  }`}
                >
                  {gruppen.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                  <option value="__NEW__">+ Neue Gruppe anlegen...</option>
                </select>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Name der neuen Gruppe"
                      value={neueGruppe}
                      onChange={(e) => setNeueGruppe(e.target.value)}
                      className={`flex-1 p-3.5 bg-slate-50 border rounded-xl text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/50 transition ${
                        errors.gruppe ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200'
                      }`}
                      autoFocus
                    />
                    {gruppen.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsNeueGruppeSelected(false);
                          setGruppe(gruppen[0]);
                          setNeueGruppe('');
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold transition border border-slate-200"
                      >
                        Abbrechen
                      </button>
                    )}
                  </div>
                </div>
              )}
              {errors.gruppe && (
                <p className="text-rose-500 text-xs font-semibold">{errors.gruppe}</p>
              )}
            </div>

            {/* Besonderheiten (Allergien etc.) */}
            <div className="space-y-1.5">
              <label htmlFor="besonderheiten" className="block text-sm font-bold text-slate-700">
                Besonderheiten / Allergien / Hinweise <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="besonderheiten"
                value={besonderheiten}
                onChange={(e) => setBesonderheiten(e.target.value)}
                placeholder="z.B. Erdnussallergie, vegetarisch, Darf nur von Mutter abgeholt werden..."
                rows={3}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/50 transition resize-none"
              />
            </div>

          </div>

          {/* Footer */}
          <div className="bg-slate-50 p-5 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition text-base md:text-sm focus:outline-none"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="py-3 px-6 bg-[#4A90D9] hover:bg-[#357ABD] text-white font-bold rounded-xl shadow-sm transition text-base md:text-sm focus:outline-none"
            >
              Speichern
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
