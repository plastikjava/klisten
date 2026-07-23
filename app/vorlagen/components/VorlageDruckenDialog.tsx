'use client';

import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Listenvorlage, Kind } from '@/types';
import { formatierteAltersAngabe } from '@/lib/alter';
import { kinderFiltern } from '@/lib/listengenerator';

interface VorlageDruckenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vorlage: Listenvorlage | null;
}

export default function VorlageDruckenDialog({
  isOpen,
  onClose,
  vorlage,
}: VorlageDruckenDialogProps) {
  // Query all active kids
  const allKinder = useLiveQuery(() => db.kinder.filter((k) => !k.geloescht).toArray()) || [];

  // Stepper state for empty columns (default 4 columns for checkboxes/notes)
  const [emptyColumnsCount, setEmptyColumnsCount] = useState<number>(4);
  
  // Custom column headers array (e.g. ["Datum:", "Datum:", ...])
  const [columnHeaders, setColumnHeaders] = useState<string[]>(['', '', '', '']);

  // Update headers array length when count changes
  const handleCountChange = (newCount: number) => {
    const clamped = Math.max(0, Math.min(10, newCount));
    setEmptyColumnsCount(clamped);
    setColumnHeaders((prev) => {
      const next = [...prev];
      if (clamped > next.length) {
        for (let i = next.length; i < clamped; i++) {
          next.push('');
        }
      } else {
        next.length = clamped;
      }
      return next;
    });
  };

  const handleHeaderChange = (index: number, val: string) => {
    setColumnHeaders((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  // Get kids for this template
  const listKinder = useMemo(() => {
    if (!vorlage) return [];

    let result: Kind[] = [];
    if (vorlage.istStatisch && vorlage.kinderIds) {
      const set = new Set(vorlage.kinderIds);
      result = allKinder.filter((k) => set.has(k.id));
    } else if (vorlage.filterOptionen) {
      result = kinderFiltern(allKinder, vorlage.filterOptionen);
    } else {
      result = [...allKinder];
    }

    // Sort alphabetically by name
    return result.sort((a, b) => a.vorname.localeCompare(b.vorname, 'de'));
  }, [vorlage, allKinder]);

  if (!isOpen || !vorlage) return null;

  const heuteStr = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Modal Dialog for Configuration (Hidden during printing) */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 select-none flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="bg-purple-600 p-5 text-white flex justify-between items-center shrink-0">
            <h2 className="text-lg font-bold flex items-center gap-2">
              🖨️ Liste drucken: {vorlage.name}
            </h2>
            <button 
              onClick={onClose} 
              className="text-white/80 hover:text-white text-2xl font-bold focus:outline-none"
              aria-label="Schließen"
            >
              ✕
            </button>
          </div>

          {/* Form Options */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            
            {/* Info summary */}
            <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 text-sm text-purple-900 flex justify-between items-center">
              <div>
                <span className="font-bold block">{vorlage.name}</span>
                <span className="text-xs text-purple-700">
                  {listKinder.length} {listKinder.length === 1 ? 'Kind' : 'Kinder'} in dieser Liste
                </span>
              </div>
              <span className="text-2xl">📋</span>
            </div>

            {/* Stepper: Empty Columns Count */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">
                Anzahl leere Spalten (zum Ankreuzen / Eintragen)
              </label>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleCountChange(emptyColumnsCount - 1)}
                  disabled={emptyColumnsCount <= 0}
                  className="w-12 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-2xl transition focus:outline-none disabled:opacity-40 flex items-center justify-center"
                >
                  -
                </button>
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl py-2.5 text-center font-black text-xl text-purple-600">
                  {emptyColumnsCount} {emptyColumnsCount === 1 ? 'Spalte' : 'Spalten'}
                </div>
                <button
                  type="button"
                  onClick={() => handleCountChange(emptyColumnsCount + 1)}
                  disabled={emptyColumnsCount >= 10}
                  className="w-12 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-2xl transition focus:outline-none disabled:opacity-40 flex items-center justify-center"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Fügt leere Tabellenspalten für Daten, Haken oder Unterschriften hinzu.
              </p>
            </div>

            {/* Optional Header Labels for Empty Columns */}
            {emptyColumnsCount > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Spaltenüberschriften <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: emptyColumnsCount }).map((_, idx) => (
                    <input
                      key={idx}
                      type="text"
                      placeholder={`Spalte ${idx + 1} (z.B. Datum)`}
                      value={columnHeaders[idx] || ''}
                      onChange={(e) => handleHeaderChange(idx, e.target.value)}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-600/30 transition"
                    />
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-2xl transition text-sm focus:outline-none"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-2xl shadow-md transition text-sm focus:outline-none flex items-center gap-2"
            >
              🖨️ Jetzt drucken
            </button>
          </div>

        </div>
      </div>

      {/* --- PRINTABLE HTML TABLE (Rendered only during window.print()) --- */}
      <div className="hidden print:block w-full text-black bg-white print-container p-4 select-none">
        
        {/* Printable Header */}
        <div className="flex justify-between items-end border-b-2 border-slate-800 pb-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{vorlage.name}</h1>
            {vorlage.beschreibung && (
              <p className="text-xs text-slate-600 mt-0.5 italic">{vorlage.beschreibung}</p>
            )}
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              Gesamt: {listKinder.length} Kinder
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-800">Kita-Listen</p>
            <p className="text-xs text-slate-500">Datum: {heuteStr}</p>
          </div>
        </div>

        {/* Printable Table */}
        <table className="w-full mt-4 border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 border border-slate-400">
              <th className="border border-slate-400 p-2 text-center w-10 font-bold">#</th>
              <th className="border border-slate-400 p-2 text-left font-bold">Name</th>
              <th className="border border-slate-400 p-2 text-left w-24 font-bold">Gruppe</th>
              <th className="border border-slate-400 p-2 text-left w-24 font-bold">Alter</th>
              <th className="border border-slate-400 p-2 text-left font-bold">Besonderheiten</th>

              {/* Dynamic Empty Columns */}
              {Array.from({ length: emptyColumnsCount }).map((_, idx) => (
                <th key={idx} className="border border-slate-400 p-2 text-center font-bold min-w-[3.5rem]">
                  {columnHeaders[idx]?.trim() || `Datum: _____`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listKinder.map((kind, idx) => (
              <tr key={kind.id} className="border-b border-slate-300">
                <td className="border border-slate-400 p-2 text-center font-semibold text-slate-500">
                  {idx + 1}
                </td>
                <td className="border border-slate-400 p-2 text-left font-bold text-slate-900">
                  {kind.vorname}
                </td>
                <td className="border border-slate-400 p-2 text-left text-slate-700">
                  {kind.gruppe}
                </td>
                <td className="border border-slate-400 p-2 text-left text-slate-700 whitespace-nowrap">
                  {formatierteAltersAngabe(kind.geburtsdatum)}
                </td>
                <td className="border border-slate-400 p-2 text-left text-slate-600 italic">
                  {kind.besonderheiten || ''}
                </td>

                {/* Empty cells for handwriting / checkmarks */}
                {Array.from({ length: emptyColumnsCount }).map((_, colIdx) => (
                  <td key={colIdx} className="border border-slate-400 p-2 text-center min-w-[3.5rem]">
                    &nbsp;
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Printable Footer */}
        <div className="mt-6 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-2 flex justify-between items-center">
          <span>Kita-Listen App</span>
          <span>Erstellt am: {heuteStr}</span>
        </div>

      </div>
    </>
  );
}
