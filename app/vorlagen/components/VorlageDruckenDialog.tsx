'use client';

import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Listenvorlage, Kind } from '@/types';
import { berechneAlter, formatierteAltersAngabe } from '@/lib/alter';
import { kinderFiltern } from '@/lib/listengenerator';

interface VorlageDruckenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vorlage: Listenvorlage | null;
}

type SortOption = 'name_asc' | 'alter_asc' | 'alter_desc' | 'gruppe';

export default function VorlageDruckenDialog({
  isOpen,
  onClose,
  vorlage,
}: VorlageDruckenDialogProps) {
  // Query all active kids
  const allKinder = useLiveQuery(() => db.kinder.filter((k) => !k.geloescht).toArray()) || [];

  // Dialog Controls
  const [emptyColumnsCount, setEmptyColumnsCount] = useState<number>(4);
  const [columnHeaders, setColumnHeaders] = useState<string[]>(['', '', '', '']);
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');
  
  // Optional Age Filter inside print dialog
  const [alterVon, setAlterVon] = useState<number | undefined>(undefined);
  const [alterBis, setAlterBis] = useState<number | undefined>(undefined);

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

  // Filter and sort kids for this printable list
  const listKinder = useMemo(() => {
    if (!vorlage) return [];

    let basePool: Kind[] = [];
    if (vorlage.istStatisch && vorlage.kinderIds) {
      const set = new Set(vorlage.kinderIds);
      basePool = allKinder.filter((k) => set.has(k.id));
    } else if (vorlage.filterOptionen) {
      basePool = kinderFiltern(allKinder, vorlage.filterOptionen);
    } else {
      basePool = [...allKinder];
    }

    // Apply optional Age Filter if set in dialog
    let filtered = basePool.filter((kind) => {
      const alter = berechneAlter(kind.geburtsdatum);
      if (alterVon !== undefined && alter < alterVon) return false;
      if (alterBis !== undefined && alter > alterBis) return false;
      return true;
    });

    // Apply Sorting
    return filtered.sort((a, b) => {
      if (sortBy === 'name_asc') {
        return a.vorname.localeCompare(b.vorname, 'de');
      } else if (sortBy === 'alter_asc') {
        // Youngest first (later birthdate = younger)
        return b.geburtsdatum.localeCompare(a.geburtsdatum);
      } else if (sortBy === 'alter_desc') {
        // Oldest first (earlier birthdate = older)
        return a.geburtsdatum.localeCompare(b.geburtsdatum);
      } else if (sortBy === 'gruppe') {
        const comp = a.gruppe.localeCompare(b.gruppe, 'de');
        if (comp !== 0) return comp;
        return a.vorname.localeCompare(b.vorname, 'de');
      }
      return 0;
    });
  }, [vorlage, allKinder, alterVon, alterBis, sortBy]);

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
        <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 select-none flex flex-col max-h-[92vh]">
          
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

          {/* Options Content */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1 text-sm">
            
            {/* Info summary */}
            <div className="bg-purple-50/50 p-3.5 rounded-2xl border border-purple-100 text-purple-900 flex justify-between items-center">
              <div>
                <span className="font-bold block text-base">{vorlage.name}</span>
                <span className="text-xs text-purple-700">
                  {listKinder.length} {listKinder.length === 1 ? 'Kind' : 'Kinder'} ausgewählt
                </span>
              </div>
              <span className="text-2xl">📋</span>
            </div>

            {/* Sort Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Sortierung der Liste
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600/30 transition"
              >
                <option value="name_asc">🔤 Alphabetisch nach Vorname (A-Z)</option>
                <option value="alter_asc">👶 Nach Alter: Jüngste zuerst</option>
                <option value="alter_desc">🧒 Nach Alter: Älteste zuerst</option>
                <option value="gruppe">👥 Nach Gruppen sortieren</option>
              </select>
            </div>

            {/* Age Filter inside Print Dialog */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Alters-Einschränkung <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                {(alterVon !== undefined || alterBis !== undefined) && (
                  <button
                    type="button"
                    onClick={() => { setAlterVon(undefined); setAlterBis(undefined); }}
                    className="text-xs text-rose-500 font-bold hover:underline"
                  >
                    Zurücksetzen
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="printAlterVon" className="block text-xs text-slate-500 mb-1 font-semibold">Alter von (Jahren):</label>
                  <select
                    id="printAlterVon"
                    value={alterVon ?? ''}
                    onChange={(e) => setAlterVon(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-600/30"
                  >
                    <option value="">Alle Altersstufen</option>
                    <option value="3">Ab 3 Jahren</option>
                    <option value="4">Ab 4 Jahren</option>
                    <option value="5">Ab 5 Jahren</option>
                    <option value="6">Ab 6 Jahren</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="printAlterBis" className="block text-xs text-slate-500 mb-1 font-semibold">Alter bis (Jahren):</label>
                  <select
                    id="printAlterBis"
                    value={alterBis ?? ''}
                    onChange={(e) => setAlterBis(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-600/30"
                  >
                    <option value="">Alle Altersstufen</option>
                    <option value="3">Bis 3 Jahre</option>
                    <option value="4">Bis 4 Jahre</option>
                    <option value="5">Bis 5 Jahre</option>
                    <option value="6">Bis 6 Jahre</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Stepper: Empty Columns Count */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Anzahl leere Spalten (zum Ankreuzen)
              </label>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleCountChange(emptyColumnsCount - 1)}
                  disabled={emptyColumnsCount <= 0}
                  className="w-11 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-2xl transition focus:outline-none disabled:opacity-40 flex items-center justify-center"
                >
                  -
                </button>
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl py-2 text-center font-black text-lg text-purple-600">
                  {emptyColumnsCount} {emptyColumnsCount === 1 ? 'Spalte' : 'Spalten'}
                </div>
                <button
                  type="button"
                  onClick={() => handleCountChange(emptyColumnsCount + 1)}
                  disabled={emptyColumnsCount >= 8}
                  className="w-11 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-2xl transition focus:outline-none disabled:opacity-40 flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Optional Header Labels for Empty Columns */}
            {emptyColumnsCount > 0 && (
              <div className="space-y-2 pt-1">
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
              disabled={listKinder.length === 0}
              className="py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-2xl shadow-md transition text-sm focus:outline-none flex items-center gap-2 disabled:opacity-50"
            >
              🖨️ Jetzt drucken
            </button>
          </div>

        </div>
      </div>

      {/* --- PRINTABLE SINGLE A4 PAGE TABLE (Rendered only during window.print()) --- */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 9.5pt !important;
          }
          .no-print {
            display: none !important;
          }
          .print-clean-page {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-clean-page table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 9.5pt !important;
          }
          .print-clean-page th {
            padding: 4px 6px !important;
            font-size: 9.5pt !important;
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-clean-page td {
            padding: 3px 6px !important;
            font-size: 9.5pt !important;
            height: 26px !important;
          }
          .print-clean-page tbody tr:nth-child(even) td {
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="hidden print-clean-page w-full text-black bg-white select-none">
        
        {/* Compact Single-Page Header */}
        <div className="flex justify-between items-end border-b-2 border-black pb-1.5 mb-2">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-black">{vorlage.name}</h1>
            {vorlage.beschreibung && (
              <p className="text-[9px] text-slate-700 italic">{vorlage.beschreibung}</p>
            )}
          </div>
          <div className="text-right text-[9px] text-slate-700">
            <span className="font-bold">Anzahl: {listKinder.length} Kinder</span> &bull; <span>Datum: {heuteStr}</span>
          </div>
        </div>

        {/* Compact Single-Page Printable Table */}
        <table className="w-full border-collapse leading-tight">
          <thead>
            <tr className="border border-slate-800">
              <th className="border border-slate-700 text-center w-7 font-bold">#</th>
              <th className="border border-slate-700 text-left font-bold">Name</th>
              <th className="border border-slate-700 text-left w-24 font-bold">Gruppe</th>
              <th className="border border-slate-700 text-left w-20 font-bold">Alter</th>

              {/* Dynamic Empty Columns */}
              {Array.from({ length: emptyColumnsCount }).map((_, idx) => (
                <th key={idx} className="border border-slate-700 text-center font-bold min-w-[3.2rem]">
                  {columnHeaders[idx]?.trim() ? columnHeaders[idx].trim() : '\u00A0'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listKinder.map((kind, idx) => (
              <tr key={kind.id} className="border-b border-slate-400">
                <td className="border border-slate-700 text-center font-semibold text-slate-600">
                  {idx + 1}
                </td>
                <td className="border border-slate-700 text-left font-bold text-slate-900">
                  {kind.vorname}
                </td>
                <td className="border border-slate-700 text-left text-slate-800">
                  {kind.gruppe}
                </td>
                <td className="border border-slate-700 text-left text-slate-800 whitespace-nowrap">
                  {formatierteAltersAngabe(kind.geburtsdatum)}
                </td>

                {/* Empty cells for handwriting / checkmarks */}
                {Array.from({ length: emptyColumnsCount }).map((_, colIdx) => (
                  <td key={colIdx} className="border border-slate-700 text-center min-w-[3.2rem]">
                    &nbsp;
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Compact Footer */}
        <div className="mt-2 text-[8.5pt] text-slate-500 flex justify-between items-center border-t border-slate-300 pt-1">
          <span>Kita-Listen App</span>
          <span>Seite 1 von 1</span>
        </div>

      </div>
    </>
  );
}
