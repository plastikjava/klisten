'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { berechneAlter } from '@/lib/alter';

const MONATE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

export default function GeburtstagePage() {
  const currentMonthIdx = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthIdx);

  const kinder = useLiveQuery(() => db.kinder.filter((k) => !k.geloescht).toArray()) || [];

  // Group kids by birthday month
  const kidsByMonth = React.useMemo(() => {
    const map = new Map<number, typeof kinder>();
    for (let m = 0; m < 12; m++) {
      map.set(m, []);
    }

    kinder.forEach((kind) => {
      if (!kind.geburtsdatum) return;
      const b = new Date(kind.geburtsdatum);
      const month = b.getMonth();
      const list = map.get(month) || [];
      list.push(kind);
      map.set(month, list);
    });

    // Sort kids in each month by day of birth
    map.forEach((list) => {
      list.sort((a, b) => {
        const dayA = new Date(a.geburtsdatum).getDate();
        const dayB = new Date(b.geburtsdatum).getDate();
        return dayA - dayB;
      });
    });

    return map;
  }, [kinder]);

  const selectedKids = kidsByMonth.get(selectedMonth) || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Screen Header & Month Selector */}
      <div className="no-print select-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            🎂 Geburtstags-Kalender
          </h1>
          <p className="text-slate-500 text-sm md:text-base mt-1">
            Alle Kindergeburtstage auf einen Blick. Drucke Monatsübersichten für die Kita-Wand.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-2xl shadow-sm text-sm transition flex items-center gap-2 self-start md:self-auto"
        >
          🖨️ Geburtstagsliste drucken (A4 Wandposter)
        </button>
      </div>

      {/* Month Selector Strip */}
      <div className="no-print bg-white p-2.5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-1.5 overflow-x-auto select-none">
        {MONATE.map((mName, idx) => {
          const count = (kidsByMonth.get(idx) || []).length;
          const isSelected = selectedMonth === idx;
          const isCurrent = currentMonthIdx === idx;

          return (
            <button
              key={mName}
              onClick={() => setSelectedMonth(idx)}
              className={`py-3 px-4 rounded-2xl font-bold text-xs shrink-0 transition flex flex-col items-center gap-0.5 focus:outline-none ${
                isSelected
                  ? 'bg-purple-600 text-white shadow-md'
                  : isCurrent
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold'
                  : 'bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-700'
              }`}
            >
              <span>{mName}</span>
              <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                {count} {count === 1 ? 'Geburtstag' : 'Geburtstage'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Month Cards Grid */}
      <div className="no-print bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4 select-none">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span>🎉 Geburtstage im {MONATE[selectedMonth]}</span>
            <span className="bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full font-bold">
              {selectedKids.length} {selectedKids.length === 1 ? 'Kind' : 'Kinder'}
            </span>
          </h2>
        </div>

        {selectedKids.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <span className="text-4xl block">🎈</span>
            <p className="font-bold">Keine Geburtstage im {MONATE[selectedMonth]}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedKids.map((kind) => {
              const b = new Date(kind.geburtsdatum);
              const tag = b.getDate();
              const alter = berechneAlter(kind.geburtsdatum) + 1; // Age turning into

              return (
                <div
                  key={kind.id}
                  className="bg-purple-50/50 border border-purple-100 p-4 rounded-2xl flex items-center justify-between shadow-xs hover:shadow-sm transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-600 text-white font-black text-lg rounded-2xl flex flex-col items-center justify-center shadow-xs shrink-0">
                      <span>{tag}.</span>
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-base">{kind.vorname}</h3>
                      <p className="text-xs text-purple-700 font-semibold">
                        Gruppe: {kind.gruppe}
                      </p>
                    </div>
                  </div>

                  <span className="bg-white border border-purple-200 text-purple-900 font-black text-xs px-3 py-1.5 rounded-xl">
                    wird {alter} Jahre! 🎈
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- PRINTABLE A4 WALL POSTER (Rendered only during window.print()) --- */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-clean-page {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      <div className="hidden print-clean-page w-full text-black bg-white select-none">
        <div className="text-center border-b-2 border-black pb-3 mb-4">
          <h1 className="text-3xl font-black uppercase tracking-wider">🎉 Geburtstage im {MONATE[selectedMonth]}</h1>
          <p className="text-sm font-semibold text-slate-600 mt-1">Kita-Listen &bull; Geburtstags-Kalender</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          {selectedKids.map((kind, idx) => {
            const b = new Date(kind.geburtsdatum);
            const tag = b.getDate();
            const alter = berechneAlter(kind.geburtsdatum) + 1;

            return (
              <div key={kind.id} className="border-2 border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-2xl font-black text-black block">{tag}. {MONATE[selectedMonth]}</span>
                  <span className="text-xl font-bold text-slate-900">{kind.vorname}</span>
                  <span className="text-xs text-slate-600 block">Gruppe: {kind.gruppe}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold bg-slate-100 border border-slate-400 px-3 py-1 rounded-lg">
                    wird {alter}! 🎈
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center text-xs text-slate-400 border-t border-slate-200 pt-2">
          Kita-Listen App &bull; Geburtstags-Wandzeitung für die Kita
        </div>
      </div>

    </div>
  );
}
