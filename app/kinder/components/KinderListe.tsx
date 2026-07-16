'use client';

import React from 'react';
import { Kind } from '@/types';
import { formatierteAltersAngabe } from '@/lib/alter';

interface KinderListeProps {
  kinder: Kind[];
  onEdit: (kind: Kind) => void;
  onDeleteRequest: (kind: Kind) => void;
}

export default function KinderListe({ kinder, onEdit, onDeleteRequest }: KinderListeProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (kinder.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center space-y-3 shadow-sm">
        <div className="text-5xl">🧒🔍</div>
        <h3 className="text-xl font-bold text-slate-700">Keine Kinder gefunden</h3>
        <p className="text-slate-500 text-sm max-w-sm mx-auto">
          Füge über den Button oben rechts dein erstes Kind hinzu oder passe deine Suche/Filter an.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
      
      {/* Table Container (Horizontal scroll on very small screens, fits beautifully on tablets) */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm font-bold uppercase select-none">
              <th className="p-4 pl-6">Name</th>
              <th className="p-4">Gruppe</th>
              <th className="p-4">Alter</th>
              <th className="p-4">Letzte Aktivität</th>
              <th className="p-4">Besonderheiten</th>
              <th className="p-4 pr-6 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {kinder.map((kind) => {
              const alterText = formatierteAltersAngabe(kind.geburtsdatum);
              
              return (
                <tr 
                  key={kind.id} 
                  className="hover:bg-slate-50/60 transition-colors group"
                >
                  {/* Name */}
                  <td className="p-4 pl-6 font-bold text-slate-800 text-base md:text-lg">
                    <div className="flex items-center gap-2">
                      {kind.vorname}
                      {kind.besonderheiten && (
                        <span 
                          title="Besonderheiten eingetragen" 
                          className="cursor-help inline-flex items-center justify-center bg-amber-100 text-amber-800 w-5 h-5 rounded-full text-xs font-bold"
                        >
                          ⚠️
                        </span>
                      )}
                    </div>
                  </td>
                  
                  {/* Gruppe */}
                  <td className="p-4 text-base">
                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-full font-semibold text-sm">
                      {kind.gruppe}
                    </span>
                  </td>
                  
                  {/* Alter */}
                  <td className="p-4 text-base">
                    <div className="flex flex-col">
                      <span className="font-semibold">{alterText}</span>
                      <span className="text-xs text-slate-400 font-normal">Geb. {formatDate(kind.geburtsdatum)}</span>
                    </div>
                  </td>
                  
                  {/* Letzte Aktivität */}
                  <td className="p-4 text-base text-slate-500">
                    {kind.letzteAktivitaetAm ? formatDate(kind.letzteAktivitaetAm) : '-'}
                  </td>
                  
                  {/* Besonderheiten */}
                  <td className="p-4 text-sm text-slate-500 max-w-xs truncate">
                    {kind.besonderheiten || <span className="text-slate-300">-</span>}
                  </td>
                  
                  {/* Actions */}
                  <td className="p-4 pr-6 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => onEdit(kind)}
                        className="p-2.5 hover:bg-sky-50 text-[#4A90D9] hover:text-[#357ABD] rounded-xl transition focus:outline-none"
                        title="Bearbeiten"
                      >
                        <span className="text-xl md:text-2xl">✏️</span>
                      </button>
                      <button
                        onClick={() => onDeleteRequest(kind)}
                        className="p-2.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-xl transition focus:outline-none"
                        title="Löschen"
                      >
                        <span className="text-xl md:text-2xl">🗑️</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
