'use client';

import React from 'react';
import { Listenvorlage } from '@/types';

interface VorlagenLeisteProps {
  vorlagen: Listenvorlage[];
  aktiveVorlage: Listenvorlage | null;
  onSelect: (vorlage: Listenvorlage | null) => void;
  onDeleteRequest: (vorlage: Listenvorlage) => void;
}

export default function VorlagenLeiste({
  vorlagen,
  aktiveVorlage,
  onSelect,
  onDeleteRequest,
}: VorlagenLeisteProps) {
  
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'nie';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-2 select-none">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
          📚 Gespeicherte Listenvorlagen
        </h3>
        {aktiveVorlage && (
          <button
            onClick={() => onSelect(null)}
            className="text-xs text-purple-600 hover:text-purple-800 font-bold focus:outline-none flex items-center gap-1"
          >
            ✕ Auswahl aufheben
          </button>
        )}
      </div>

      {vorlagen.length === 0 ? (
        <div className="bg-purple-50/40 p-5 rounded-2xl border border-purple-100/50 text-center text-slate-500 text-sm">
          💡 Noch keine Vorlagen gespeichert. Wähle Filter aus und klicke auf <strong>„Als Vorlage speichern“</strong>.
        </div>
      ) : (
        /* Horizontal Scrollable container for Tablet friendliness */
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-purple-200">
          {vorlagen.map((v) => {
            const istAktiv = aktiveVorlage?.id === v.id;
            
            return (
              <div
                key={v.id}
                onClick={() => onSelect(istAktiv ? null : v)}
                className={`relative p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between shrink-0 w-[240px] shadow-sm select-none ${
                  istAktiv
                    ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-600/20'
                    : 'border-slate-200 bg-white hover:border-purple-300 hover:shadow'
                }`}
              >
                
                {/* Delete button (stop event bubbling so it doesn't trigger card selection) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRequest(v);
                  }}
                  className="absolute right-3 top-3 text-slate-400 hover:text-rose-500 p-1.5 hover:bg-slate-100 rounded-lg transition focus:outline-none"
                  title="Vorlage löschen"
                >
                  🗑️
                </button>

                <div className="space-y-1.5 pr-6">
                  <h4 className="font-bold text-slate-800 truncate text-base">
                    {v.name}
                  </h4>
                  {v.beschreibung ? (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {v.beschreibung}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-300 italic">Keine Beschreibung</p>
                  )}
                </div>

                <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Zuletzt genutzt:</span>
                  <span className="font-semibold text-slate-600">
                    {formatDate(v.zuletztVerwendetAm)}
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
