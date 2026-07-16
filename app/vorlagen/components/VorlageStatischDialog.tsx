'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Kind, Listenvorlage } from '@/types';

interface VorlageStatischDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vorlage: Listenvorlage | null; // If editing, otherwise null
  onSave: (name: string, beschreibung: string, kinderIds: string[], isNew: boolean) => void;
}

export default function VorlageStatischDialog({
  isOpen,
  onClose,
  vorlage,
  onSave,
}: VorlageStatischDialogProps) {
  // Live query all children
  const allKinder = useLiveQuery(() => db.kinder.toArray()) || [];

  const [name, setName] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [selectedKidIds, setSelectedKidIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  // Reset/populate form when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (vorlage) {
        setName(vorlage.name);
        setBeschreibung(vorlage.beschreibung || '');
        setSelectedKidIds(vorlage.kinderIds || []);
      } else {
        setName('');
        setBeschreibung('');
        setSelectedKidIds([]);
      }
      setSearchQuery('');
      setError('');
    }
  }, [isOpen, vorlage]);

  // Filter children based on search query
  const gefilterteKinder = useMemo(() => {
    if (!searchQuery.trim()) {
      return [...allKinder].sort((a, b) => a.vorname.localeCompare(b.vorname, 'de'));
    }
    const q = searchQuery.toLowerCase();
    return allKinder
      .filter(
        (k) =>
          k.vorname.toLowerCase().includes(q) ||
          k.gruppe.toLowerCase().includes(q)
      )
      .sort((a, b) => a.vorname.localeCompare(b.vorname, 'de'));
  }, [allKinder, searchQuery]);

  if (!isOpen) return null;

  const handleToggleKid = (id: string) => {
    setSelectedKidIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Bitte gib einen Namen für die Liste an.');
      return;
    }

    if (selectedKidIds.length === 0) {
      setError('Bitte wähle mindestens ein Kind für die Liste aus.');
      return;
    }

    onSave(
      name.trim(),
      beschreibung.trim(),
      selectedKidIds,
      !vorlage // isNew = true if vorlage is null
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] select-none">
        
        {/* Header */}
        <div className="bg-purple-600 p-5 text-white flex justify-between items-center shrink-0">
          <h2 className="text-lg font-bold flex items-center gap-2">
            📚 {vorlage ? 'Feste Liste bearbeiten' : 'Neue feste Liste erstellen'}
          </h2>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white text-2xl font-bold focus:outline-none"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1 max-h-[60vh]">
            
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-xl text-sm font-semibold">
                ⚠️ {error}
              </div>
            )}

            {/* List Name */}
            <div className="space-y-1.5">
              <label htmlFor="staticListName" className="block text-sm font-bold text-slate-700">
                Name der Gruppe / Liste *
              </label>
              <input
                type="text"
                id="staticListName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Jugendgruppe A, Projektgruppe Rot..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-purple-600/30 transition"
                autoComplete="off"
                autoFocus
              />
            </div>

            {/* List Description */}
            <div className="space-y-1.5">
              <label htmlFor="staticListDesc" className="block text-sm font-bold text-slate-700">
                Beschreibung <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="staticListDesc"
                value={beschreibung}
                onChange={(e) => setBeschreibung(e.target.value)}
                placeholder="z.B. Feste Einteilung der 11 Kinder für die Dienstags-Aktivität..."
                rows={2}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/30 transition resize-none"
              />
            </div>

            {/* Kid Selector Section */}
            <div className="space-y-2 pt-2 border-t border-slate-100 flex flex-col">
              <div className="flex items-center justify-between gap-4">
                <label className="block text-sm font-bold text-slate-700">
                  Kinder hinzufügen ({selectedKidIds.length} ausgewählt)
                </label>
                {selectedKidIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedKidIds([])}
                    className="text-xs text-rose-500 hover:text-rose-700 font-bold"
                  >
                    Auswahl aufheben
                  </button>
                )}
              </div>

              {/* Search input inside modal for easy filtering */}
              <input
                type="text"
                placeholder="🔍 Nach Name oder Gruppe suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/30 transition"
              />

              {/* Scrollable list with large touch targets */}
              <div className="border border-slate-150 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto bg-slate-50/50">
                {gefilterteKinder.length === 0 ? (
                  <p className="p-4 text-sm text-slate-400 italic text-center">Keine Kinder gefunden.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {gefilterteKinder.map((kind) => {
                      const isSelected = selectedKidIds.includes(kind.id);
                      return (
                        <div
                          key={kind.id}
                          onClick={() => handleToggleKid(kind.id)}
                          className={`flex items-center gap-3 p-3 cursor-pointer transition-colors select-none ${
                            isSelected ? 'bg-purple-50/40 hover:bg-purple-50' : 'hover:bg-slate-100/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Handled by container click
                            className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500/50 border-slate-300"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-slate-800 text-sm block truncate">
                              {kind.vorname}
                            </span>
                            <span className="text-[10px] bg-slate-200/70 text-slate-600 font-bold px-1.5 py-0.5 rounded">
                              {kind.gruppe}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
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
