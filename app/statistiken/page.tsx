'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { letzteAktivitaetProKindFuerAlleVorlagen } from '@/lib/db-operations';
import { formatierteAltersAngabe } from '@/lib/alter';

export default function StatistikenPage() {
  const [selectedVorlageId, setSelectedVorlageId] = useState<string>('ALLE');

  const kinder = useLiveQuery(() => db.kinder.filter((k) => !k.geloescht).toArray()) || [];
  const vorlagen = useLiveQuery(() => db.vorlagen.filter((v) => !v.geloescht).toArray()) || [];
  const logs = useLiveQuery(() => db.aktivitaetsLog.toArray()) || [];

  // Count participation per kid
  const stats = React.useMemo(() => {
    const countsMap = new Map<string, number>();
    const lastDateMap = new Map<string, string>();

    logs.forEach((log) => {
      if (selectedVorlageId !== 'ALLE' && log.vorlagenId !== selectedVorlageId) {
        return;
      }
      countsMap.set(log.kindId, (countsMap.get(log.kindId) || 0) + 1);
      
      const prevDate = lastDateMap.get(log.kindId) || '';
      if (log.datum > prevDate) {
        lastDateMap.get(log.kindId);
        lastDateMap.set(log.kindId, log.datum);
      }
    });

    const list = kinder.map((k) => ({
      kind: k,
      count: countsMap.get(k.id) || 0,
      lastDate: lastDateMap.get(k.id) || k.letzteAktivitaetAm || undefined
    }));

    // Sort by count (ascending) to show who was chosen least
    list.sort((a, b) => a.count - b.count || a.kind.vorname.localeCompare(b.kind.vorname, 'de'));

    const maxCount = Math.max(...list.map(l => l.count), 1);

    return { list, maxCount, totalLogs: logs.length };
  }, [kinder, logs, selectedVorlageId]);

  const formatDateGerman = (dStr?: string) => {
    if (!dStr) return 'Noch nie';
    const [y, m, d] = dStr.split('-');
    return `${d}.${m}.${y}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="select-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            📊 Teilnahme-Statistiken & Fairness-Report
          </h1>
          <p className="text-slate-500 text-sm md:text-base mt-1">
            Übersicht über die Teilnahme-Häufigkeit aller Kinder zur fairen Gleichbehandlung.
          </p>
        </div>

        {/* Template Filter */}
        <select
          value={selectedVorlageId}
          onChange={(e) => setSelectedVorlageId(e.target.value)}
          className="p-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600/30 shadow-xs self-start md:self-auto"
        >
          <option value="ALLE">Alle Vorlagen & Aktivitäten zusammen</option>
          {vorlagen.map((v) => (
            <option key={v.id} value={v.id}>
              Vorlage: {v.name}
            </option>
          ))}
        </select>
      </div>

      {/* Fairness Ranking Cards */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4 select-none">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <span>⚖️ Teilnahme-Ranking</span>
            <span className="text-xs text-slate-400 font-semibold">
              (Kinder oben wurden am seltensten ausgewählt)
            </span>
          </h2>
        </div>

        {stats.list.length === 0 ? (
          <p className="text-sm text-slate-400 italic py-8 text-center">Keine Kinderdaten vorhanden.</p>
        ) : (
          <div className="space-y-3">
            {stats.list.map((item, idx) => {
              const percentage = Math.round((item.count / stats.maxCount) * 100);

              return (
                <div key={item.kind.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <span className="w-6 text-center text-slate-400 font-extrabold">{idx + 1}.</span>
                      <span className="text-sm">{item.kind.vorname}</span>
                      <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                        {item.kind.gruppe}
                      </span>
                      <span className="text-slate-500 font-normal">
                        ({formatierteAltersAngabe(item.kind.geburtsdatum)})
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-slate-600 font-semibold">
                      <span>Zuletzt dabei: <strong className="text-slate-800">{formatDateGerman(item.lastDate)}</strong></span>
                      <span className="bg-purple-100 text-purple-900 px-3 py-1 rounded-full font-black text-xs">
                        {item.count} {item.count === 1 ? 'Mal' : 'Male'}
                      </span>
                    </div>
                  </div>

                  {/* Visual Bar Indicator */}
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        item.count === 0
                          ? 'bg-rose-500'
                          : percentage < 40
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
