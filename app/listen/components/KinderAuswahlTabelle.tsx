'use client';

import React, { useState, useMemo } from 'react';
import { Kind, Listenvorlage } from '@/types';
import { formatierteAltersAngabe } from '@/lib/alter';

interface KinderAuswahlTabelleProps {
  kinder: Kind[]; // All filtered children
  manuellGewaehltIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  vorlagen: Listenvorlage[];
  aktiveVorlage: Listenvorlage | null;
  aktivitaetsLogMap: Map<string, Map<string, string>>; // templateId -> Map<kindId, date>
  onProceed: (onlyManual: boolean) => void;
  onBack: () => void;
  limit?: number; // Target list size
}

type SortField = 'name' | 'gruppe' | 'alter' | 'global' | string; // string represents template_${id}

export default function KinderAuswahlTabelle({
  kinder,
  manuellGewaehltIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  vorlagen,
  aktiveVorlage,
  aktivitaetsLogMap,
  onProceed,
  onBack,
  limit,
}: KinderAuswahlTabelleProps) {
  
  // Sorting state
  // Default sort: if template active, sort by its activity date ascending (oldest first). Otherwise, by name.
  const [sortField, setSortField] = useState<SortField>(
    aktiveVorlage ? `template_${aktiveVorlage.id}` : 'name'
  );
  const [sortReverse, setSortReverse] = useState(false);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '–';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  // Resolve activity dates helper
  const getActivityDate = (kindId: string, templateId: string) => {
    return aktivitaetsLogMap.get(templateId)?.get(kindId);
  };

  // Sort and filter execution
  const sortierteKinder = useMemo(() => {
    return [...kinder].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'name') {
        comparison = a.vorname.localeCompare(b.vorname, 'de');
      } else if (sortField === 'gruppe') {
        comparison = a.gruppe.localeCompare(b.gruppe, 'de');
        if (comparison === 0) comparison = a.vorname.localeCompare(b.vorname, 'de');
      } else if (sortField === 'alter') {
        comparison = a.geburtsdatum.localeCompare(b.geburtsdatum); // Older first (smaller birthdate string)
      } else if (sortField === 'global') {
        const dateA = a.letzteAktivitaetAm || '';
        const dateB = b.letzteAktivitaetAm || '';
        
        if (dateA === '') return -1; // Empty first
        if (dateB === '') return 1;
        comparison = dateA.localeCompare(dateB);
      } else if (sortField.startsWith('template_')) {
        const templateId = sortField.replace('template_', '');
        const dateA = getActivityDate(a.id, templateId) || '';
        const dateB = getActivityDate(b.id, templateId) || '';
        
        if (dateA === '') return -1; // Empty first
        if (dateB === '') return 1;
        comparison = dateA.localeCompare(dateB);
      }

      if (comparison === 0) {
        // Fallback to name sort
        comparison = a.vorname.localeCompare(b.vorname, 'de');
      }

      return sortReverse ? -comparison : comparison;
    });
  }, [kinder, sortField, sortReverse, aktivitaetsLogMap]);

  const handleHeaderClick = (field: SortField) => {
    if (sortField === field) {
      setSortReverse(!sortReverse);
    } else {
      setSortField(field);
      setSortReverse(false);
    }
  };

  // Target count text calculations
  const targetCount = limit !== undefined && limit > 0 ? limit : 0;
  const chosenCount = manuellGewaehltIds.length;
  const remainingCount = Math.max(0, targetCount - chosenCount);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 select-none animate-in fade-in duration-200">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            👤 Kinder manuell auswählen
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Wähle Kinder aus, die fest auf der Liste stehen sollen. Der Rest wird optional per Rotation aufgefüllt.
          </p>
        </div>
        
        {/* Quick Selection Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSelectAll}
            className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition focus:outline-none"
          >
            Alle auswählen
          </button>
          <button
            onClick={onClearSelection}
            className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition focus:outline-none"
          >
            Auswahl aufheben
          </button>
        </div>
      </div>

      {/* Interactive Selection Table */}
      <div className="overflow-x-auto border border-slate-100 rounded-2xl">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase select-none">
              <th className="p-3 pl-5 w-12">Auswahl</th>
              
              {/* Sortable Header Name */}
              <th 
                className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleHeaderClick('name')}
              >
                Name {sortField === 'name' && (sortReverse ? '▲' : '▼')}
              </th>
              
              {/* Sortable Header Gruppe */}
              <th 
                className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleHeaderClick('gruppe')}
              >
                Gruppe {sortField === 'gruppe' && (sortReverse ? '▲' : '▼')}
              </th>
              
              {/* Sortable Header Alter */}
              <th 
                className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleHeaderClick('alter')}
              >
                Alter {sortField === 'alter' && (sortReverse ? '▲' : '▼')}
              </th>

              {/* Dynamic Columns for each template */}
              {vorlagen.map((v) => {
                const isActiveCol = aktiveVorlage?.id === v.id;
                const columnField = `template_${v.id}`;
                return (
                  <th
                    key={v.id}
                    className={`p-3 cursor-pointer transition-colors hover:bg-slate-100 ${
                      isActiveCol ? 'bg-purple-50 text-purple-700' : ''
                    }`}
                    onClick={() => handleHeaderClick(columnField)}
                  >
                    📚 {v.name} {sortField === columnField && (sortReverse ? '▲' : '▼')}
                  </th>
                );
              })}

              {/* Sortable Header Global */}
              <th 
                className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleHeaderClick('global')}
              >
                Global {sortField === 'global' && (sortReverse ? '▲' : '▼')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {sortierteKinder.map((kind) => {
              const istGewaehlt = manuellGewaehltIds.includes(kind.id);
              const ageText = formatierteAltersAngabe(kind.geburtsdatum);

              return (
                <tr
                  key={kind.id}
                  onClick={() => onToggleSelect(kind.id)}
                  className={`cursor-pointer transition-colors ${
                    istGewaehlt 
                      ? 'bg-sky-50/50 hover:bg-sky-50' 
                      : 'hover:bg-slate-50/50'
                  }`}
                >
                  {/* Checkbox column */}
                  <td className="p-3 pl-5 text-center">
                    <input
                      type="checkbox"
                      checked={istGewaehlt}
                      onChange={() => {}} // Controlled by row onClick
                      className="w-5 h-5 rounded text-[#4A90D9] focus:ring-[#4A90D9]/50 border-slate-300"
                    />
                  </td>

                  {/* Name */}
                  <td className="p-3 font-bold text-slate-800 text-base">
                    <div className="flex items-center gap-1.5">
                      {kind.vorname}
                      {kind.besonderheiten && (
                        <span 
                          title={kind.besonderheiten}
                          className="inline-flex items-center justify-center bg-amber-100 text-amber-800 w-4 h-4 rounded-full text-[10px] font-bold"
                        >
                          ⚠️
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Gruppe */}
                  <td className="p-3">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold text-xs">
                      {kind.gruppe}
                    </span>
                  </td>

                  {/* Alter */}
                  <td className="p-3 font-semibold text-slate-600">{ageText}</td>

                  {/* Template-specific columns */}
                  {vorlagen.map((v) => {
                    const date = getActivityDate(kind.id, v.id);
                    const isActiveCol = aktiveVorlage?.id === v.id;
                    return (
                      <td
                        key={v.id}
                        className={`p-3 font-medium text-xs ${
                          isActiveCol ? 'bg-purple-50/30 font-semibold' : ''
                        }`}
                      >
                        {formatDate(date)}
                      </td>
                    );
                  })}

                  {/* Global */}
                  <td className="p-3 text-xs text-slate-400">
                    {formatDate(kind.letzteAktivitaetAm)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Target count status indicator banner */}
      {targetCount > 0 && (
        <div className="bg-[#FAFAF5] border border-slate-200/60 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-600">
            {chosenCount === 0 ? (
              <span>Keine Kinder manuell ausgewählt. Alle <strong>{targetCount}</strong> Plätze werden per Zufall/Rotation besetzt.</span>
            ) : chosenCount >= targetCount ? (
              <span><strong>{chosenCount}</strong> Kinder manuell ausgewählt. Keine zusätzlichen Plätze werden aufgefüllt.</span>
            ) : (
              <span>
                <strong>{chosenCount}</strong> von <strong>{targetCount}</strong> Kindern manuell ausgewählt. 
                Die restlichen <strong>{remainingCount}</strong> Plätze werden per Rotation aufgefüllt.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Control Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-2">
        <button
          onClick={onBack}
          className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition text-base md:text-sm focus:outline-none"
        >
          &larr; Filter anpassen
        </button>

        <div className="flex flex-col sm:flex-row gap-2">
          {chosenCount > 0 && (
            <button
              onClick={() => onProceed(true)}
              className="py-3 px-5 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-xl shadow-sm transition text-base md:text-sm focus:outline-none"
            >
              Nur gewählte Kinder ({chosenCount}) übernehmen
            </button>
          )}

          <button
            onClick={() => onProceed(false)}
            className="py-3 px-6 bg-[#4A90D9] hover:bg-[#357ABD] text-white font-extrabold rounded-xl shadow-sm transition text-base md:text-sm focus:outline-none"
          >
            {targetCount > 0 && chosenCount < targetCount ? '🎲 Rest auffüllen & weiter' : 'Weiter & Liste anzeigen'}
          </button>
        </div>
      </div>

    </div>
  );
}
