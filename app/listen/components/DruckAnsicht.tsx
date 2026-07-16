'use client';

import React from 'react';
import { Kind } from '@/types';
import { formatierteAltersAngabe } from '@/lib/alter';

interface DruckAnsichtProps {
  kinder: Kind[];
  filterInfoText: string;
}

export default function DruckAnsicht({ kinder, filterInfoText }: DruckAnsichtProps) {
  if (kinder.length === 0) return null;

  const heuteStr = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="hidden print:block w-full text-black bg-white print-container p-4">
      
      {/* Print Header */}
      <div className="flex justify-between items-end border-b-2 border-slate-300 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Kita-Listen</h1>
          <p className="text-xs text-slate-500 mt-1 italic">
            Filterkriterien: {filterInfoText}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-500">Gedruckt am: {heuteStr}</p>
        </div>
      </div>

      {/* Print Table */}
      <table className="w-full mt-6 border-collapse text-sm">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300">
            <th className="border border-slate-300 p-2 text-left w-12">Nr.</th>
            <th className="border border-slate-300 p-2 text-left">Name</th>
            <th className="border border-slate-300 p-2 text-left w-32">Gruppe</th>
            <th className="border border-slate-300 p-2 text-left w-36">Alter</th>
            <th className="border border-slate-300 p-2 text-left w-36">Letzte Aktivität</th>
            <th className="border border-slate-300 p-2 text-left">Besonderheiten</th>
          </tr>
        </thead>
        <tbody>
          {kinder.map((kind, idx) => (
            <tr key={kind.id} className="border-b border-slate-200">
              <td className="border border-slate-300 p-2 text-left font-semibold text-slate-500">{idx + 1}</td>
              <td className="border border-slate-300 p-2 text-left font-bold text-slate-800">{kind.vorname}</td>
              <td className="border border-slate-300 p-2 text-left">{kind.gruppe}</td>
              <td className="border border-slate-300 p-2 text-left">
                {formatierteAltersAngabe(kind.geburtsdatum)}
              </td>
              <td className="border border-slate-300 p-2 text-left">
                {formatDate(kind.letzteAktivitaetAm)}
              </td>
              <td className="border border-slate-300 p-2 text-left italic text-slate-600">
                {kind.besonderheiten || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Print Footer */}
      <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-2">
        Kita-Listen App &bull; Alle Daten wurden lokal auf dem Gerät verarbeitet &bull; Ohne Cloud-Sync
      </div>

    </div>
  );
}
