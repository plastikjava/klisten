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

      {/* Age Span Input */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="alterVon" className="block text-sm font-bold text-slate-700">
            Alter von (Jahre)
          </label>
          <input
            type="number"
            id="alterVon"
            min="0"
            max="18"
            value={filter.alterVon !== undefined ? filter.alterVon : ''}
            onChange={handleAlterVonChange}
            placeholder="beliebig"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/50 transition"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="alterBis" className="block text-sm font-bold text-slate-700">
            Alter bis (Jahre)
          </label>
          <input
            type="number"
            id="alterBis"
            min="0"
            max="18"
            value={filter.alterBis !== undefined ? filter.alterBis : ''}
            onChange={handleAlterBisChange}
            placeholder="beliebig"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/50 transition"
          />
        </div>
      </div>

      {/* Target Count & Random Toggle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
        
        {/* Count limit */}
        <div className="space-y-1.5">
          <label htmlFor="anzahl" className="block text-sm font-bold text-slate-700">
            Anzahl Kinder begrenzen auf
          </label>
          <input
            type="number"
            id="anzahl"
            min="1"
            value={filter.anzahl !== undefined ? filter.anzahl : ''}
            onChange={handleAnzahlChange}
            placeholder="alle Treffer"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/50 transition"
          />
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
