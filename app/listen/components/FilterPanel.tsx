'use client';

import React from 'react';
import { FilterOptionen } from '@/types';

interface FilterPanelProps {
  gruppen: string[]; // All available groups in DB
  filter: FilterOptionen;
  setFilter: React.Dispatch<React.SetStateAction<FilterOptionen>>;
  onGenerate: () => void;
  hasResults: boolean;
}

export default function FilterPanel({ gruppen, filter, setFilter, onGenerate, hasResults }: FilterPanelProps) {
  
  const handleToggleGruppe = (gruppe: string) => {
    setFilter((prev) => {
      const existiert = prev.gruppen.includes(gruppe);
      const neueGruppen = existiert
        ? prev.gruppen.filter((g) => g !== gruppe)
        : [...prev.gruppen, gruppe];
      
      return { ...prev, gruppen: neueGruppen };
    });
  };

  const handleAlterVonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value ? parseInt(e.target.value) : undefined;
    setFilter((prev) => ({ ...prev, alterVon: val }));
  };

  const handleAlterBisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value ? parseInt(e.target.value) : undefined;
    setFilter((prev) => ({ ...prev, alterBis: val }));
  };

  const handleAnzahlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value ? parseInt(e.target.value) : undefined;
    setFilter((prev) => ({ ...prev, anzahl: val }));
  };

  const handleZufallToggle = () => {
    setFilter((prev) => ({ ...prev, zufallsauswahl: !prev.zufallsauswahl }));
  };



  const handleAlterVonDec = () => {
    setFilter((prev) => {
      if (prev.alterVon === undefined) return prev;
      if (prev.alterVon === 3) {
        return { ...prev, alterVon: undefined };
      }
      return { ...prev, alterVon: prev.alterVon - 1 };
    });
  };

  const handleAlterVonInc = () => {
    setFilter((prev) => {
      if (prev.alterVon === undefined) {
        return { ...prev, alterVon: 3 };
      }
      if (prev.alterVon >= 7) return prev;
      
      const nextVal = prev.alterVon + 1;
      if (prev.alterBis !== undefined && nextVal > prev.alterBis) {
        return prev;
      }
      return { ...prev, alterVon: nextVal };
    });
  };

  const handleAlterBisDec = () => {
    setFilter((prev) => {
      if (prev.alterBis === undefined) {
        return { ...prev, alterBis: 7 };
      }
      if (prev.alterBis <= 3) return prev;
      
      const nextVal = prev.alterBis - 1;
      if (prev.alterVon !== undefined && nextVal < prev.alterVon) {
        return prev;
      }
      return { ...prev, alterBis: nextVal };
    });
  };

  const handleAlterBisInc = () => {
    setFilter((prev) => {
      if (prev.alterBis === undefined) return prev;
      if (prev.alterBis >= 7) {
        return { ...prev, alterBis: undefined };
      }
      return { ...prev, alterBis: prev.alterBis + 1 };
    });
  };

  const handleAnzahlDec = () => {
    setFilter((prev) => {
      if (prev.anzahl === undefined) return prev;
      if (prev.anzahl <= 1) {
        return { ...prev, anzahl: undefined };
      }
      return { ...prev, anzahl: prev.anzahl - 1 };
    });
  };

  const handleAnzahlInc = () => {
    setFilter((prev) => {
      if (prev.anzahl === undefined) {
        return { ...prev, anzahl: 6 };
      }
      return { ...prev, anzahl: prev.anzahl + 1 };
    });
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 select-none">
      
      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
        ⚙️ Kriterien festlegen
      </h2>

      {/* Group Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-bold text-slate-700">
          Gruppen auswählen
        </label>
        {gruppen.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Noch keine Gruppen vorhanden. Lege zuerst Kinder in Gruppen an.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {gruppen.map((g) => {
              const istAktiv = filter.gruppen.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => handleToggleGruppe(g)}
                  className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition focus:outline-none border ${
                    istAktiv
                      ? 'bg-sky-500 border-sky-500 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        )}
        {gruppen.length > 0 && (
          <p className="text-xs text-slate-400">Keine Auswahl bedeutet: Alle Gruppen berücksichtigen.</p>
        )}
      </div>

      {/* Age Span Input (Stepper) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-slate-700">
            Alter von
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAlterVonDec}
              disabled={filter.alterVon === undefined}
              className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xl flex items-center justify-center transition disabled:opacity-40 disabled:hover:bg-slate-100 focus:outline-none"
              title="Verringern (oder zurück auf beliebig)"
            >
              -
            </button>
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-center font-bold text-slate-700 text-sm md:text-base">
              {filter.alterVon !== undefined ? `${filter.alterVon} Jahre` : 'beliebig'}
            </div>
            <button
              type="button"
              onClick={handleAlterVonInc}
              disabled={filter.alterVon !== undefined && filter.alterVon >= 7}
              className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xl flex items-center justify-center transition disabled:opacity-40 disabled:hover:bg-slate-100 focus:outline-none"
            >
              +
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-slate-700">
            Alter bis
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAlterBisDec}
              disabled={filter.alterBis !== undefined && filter.alterBis <= 3}
              className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xl flex items-center justify-center transition disabled:opacity-40 disabled:hover:bg-slate-100 focus:outline-none"
            >
              -
            </button>
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-center font-bold text-slate-700 text-sm md:text-base">
              {filter.alterBis !== undefined ? `${filter.alterBis} Jahre` : 'beliebig'}
            </div>
            <button
              type="button"
              onClick={handleAlterBisInc}
              disabled={filter.alterBis === undefined}
              className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xl flex items-center justify-center transition disabled:opacity-40 disabled:hover:bg-slate-100 focus:outline-none"
              title="Erhöhen (oder zurück auf beliebig)"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Target Count & Random Toggle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
        
        {/* Count limit */}
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-slate-700">
            Anzahl Kinder begrenzen auf
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAnzahlDec}
              disabled={filter.anzahl === undefined}
              className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xl flex items-center justify-center transition disabled:opacity-40 disabled:hover:bg-slate-100 focus:outline-none"
              title="Weniger Kinder (oder zurück auf alle)"
            >
              -
            </button>
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-center font-bold text-slate-700 text-sm md:text-base">
              {filter.anzahl !== undefined ? `${filter.anzahl} Kinder` : 'alle Treffer'}
            </div>
            <button
              type="button"
              onClick={handleAnzahlInc}
              className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xl flex items-center justify-center transition focus:outline-none"
            >
              +
            </button>
          </div>
        </div>

        {/* Random / Rotation Switch */}
        <div className="flex items-center justify-between md:justify-start md:gap-4 pt-4 md:pt-6">
          <span className="text-sm font-bold text-slate-700">
            Zufallsauswahl aktivieren
          </span>
          <button
            type="button"
            onClick={handleZufallToggle}
            className={`w-14 h-8 rounded-full transition-colors relative focus:outline-none ${
              filter.zufallsauswahl ? 'bg-[#4A90D9]' : 'bg-slate-300'
            }`}
            role="switch"
            aria-checked={filter.zufallsauswahl}
          >
            <span
              className={`w-6 h-6 rounded-full bg-white absolute top-1 transition-all shadow-sm ${
                filter.zufallsauswahl ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>

      </div>

      {/* Description of logic */}
      {filter.zufallsauswahl && (
        <div className="bg-sky-50 border border-sky-100 p-3.5 rounded-xl">
          <p className="text-xs text-sky-800 leading-relaxed">
            💡 <strong>Rotationslogik aktiv:</strong> Wenn mehr Kinder auf die Filter passen als benötigt werden, 
            werden Kinder bevorzugt, deren letzte Aktivität am längsten zurückliegt oder noch leer ist. 
            Unter Kindern mit gleichem Status entscheidet der Zufall.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={onGenerate}
          className="flex-1 py-4 px-6 bg-[#4A90D9] hover:bg-[#357ABD] text-white font-extrabold rounded-2xl shadow-sm text-lg transition focus:outline-none flex items-center justify-center gap-2"
        >
          📋 Liste generieren
        </button>
        
        {hasResults && filter.zufallsauswahl && (
          <button
            onClick={onGenerate}
            className="py-4 px-5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-2xl shadow-sm text-base transition focus:outline-none flex items-center justify-center gap-2"
            title="Erneut würfeln"
          >
            🎲 Erneut würfeln
          </button>
        )}
      </div>

    </div>
  );
}
