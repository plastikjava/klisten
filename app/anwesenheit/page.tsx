'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { AnwesenheitsStatus } from '@/types';
import { gruppenLaden, anwesenheitSetzen, anwesenheitLadenFuerDatum } from '@/lib/db-operations';
import { useToast } from '@/components/Toast';

export default function AnwesenheitPage() {
  const { showToast } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedGruppe, setSelectedGruppe] = useState<string>('ALLE');

  // Query kids and groups
  const kinder = useLiveQuery(() => db.kinder.filter((k) => !k.geloescht).toArray()) || [];
  const gruppen = useLiveQuery(() => gruppenLaden()) || [];

  // Query attendance for selected date
  const attendanceMap = useLiveQuery(async () => {
    return await anwesenheitLadenFuerDatum(selectedDate);
  }, [selectedDate]) || new Map();

  // Filter kids by group
  const gefilterteKinder = React.useMemo(() => {
    let result = [...kinder];
    if (selectedGruppe !== 'ALLE') {
      result = result.filter((k) => k.gruppe === selectedGruppe);
    }
    return result.sort((a, b) => a.vorname.localeCompare(b.vorname, 'de'));
  }, [kinder, selectedGruppe]);

  // Statistics for selected date
  const stats = React.useMemo(() => {
    let anwesend = 0;
    let krank = 0;
    let urlaub = 0;
    let fehlt = 0;
    let offen = 0;

    gefilterteKinder.forEach((k) => {
      const eintrag = attendanceMap.get(k.id);
      if (!eintrag) {
        offen++;
      } else if (eintrag.status === 'anwesend') {
        anwesend++;
      } else if (eintrag.status === 'krank') {
        krank++;
      } else if (eintrag.status === 'urlaub') {
        urlaub++;
      } else if (eintrag.status === 'fehlt') {
        fehlt++;
      }
    });

    return { anwesend, krank, urlaub, fehlt, offen, gesamt: gefilterteKinder.length };
  }, [gefilterteKinder, attendanceMap]);

  const handleSetStatus = async (kindId: string, status: AnwesenheitsStatus) => {
    try {
      await anwesenheitSetzen(kindId, selectedDate, status);
    } catch (e: any) {
      showToast(e.message || 'Fehler beim Speichern der Anwesenheit.', 'error');
    }
  };

  const handleBulkSetStatus = async (status: AnwesenheitsStatus) => {
    try {
      for (const k of gefilterteKinder) {
        await anwesenheitSetzen(k.id, selectedDate, status);
      }
      showToast(`Alle Kinder für ${selectedDate} als '${status}' markiert.`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Fehler beim Speichern.', 'error');
    }
  };

  const formatDateGerman = (dStr: string) => {
    if (!dStr) return '';
    const [y, m, d] = dStr.split('-');
    return `${d}.${m}.${y}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="select-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            📋 Digitale Anwesenheitsliste
          </h1>
          <p className="text-slate-500 text-sm md:text-base mt-1">
            Tages-Check-in für eure Gruppen. Wird automatisch live zwischen den iPads synchronisiert.
          </p>
        </div>

        {/* Date Selector & Group Selector */}
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/30 shadow-xs"
          />

          <select
            value={selectedGruppe}
            onChange={(e) => setSelectedGruppe(e.target.value)}
            className="p-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/30 shadow-xs"
          >
            <option value="ALLE">Alle Gruppen ({kinder.length} Kinder)</option>
            {gruppen.map((g) => (
              <option key={g} value={g}>
                Gruppe: {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Daily Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 select-none">
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-center">
          <div className="text-xl md:text-2xl font-black text-emerald-700">{stats.anwesend}</div>
          <div className="text-xs font-bold text-emerald-800 mt-0.5">Anwesend ✅</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-center">
          <div className="text-xl md:text-2xl font-black text-amber-700">{stats.krank}</div>
          <div className="text-xs font-bold text-amber-800 mt-0.5">Krank 🤒</div>
        </div>
        <div className="bg-sky-50 border border-sky-200 p-3.5 rounded-2xl text-center">
          <div className="text-xl md:text-2xl font-black text-sky-700">{stats.urlaub}</div>
          <div className="text-xs font-bold text-sky-800 mt-0.5">Urlaub 🏖️</div>
        </div>
        <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl text-center">
          <div className="text-xl md:text-2xl font-black text-rose-700">{stats.fehlt}</div>
          <div className="text-xs font-bold text-rose-800 mt-0.5">Fehlt ❌</div>
        </div>
        <div className="bg-slate-100 border border-slate-200 p-3.5 rounded-2xl text-center col-span-2 sm:col-span-1">
          <div className="text-xl md:text-2xl font-black text-slate-600">{stats.offen}</div>
          <div className="text-xs font-bold text-slate-500 mt-0.5">Noch offen ❓</div>
        </div>
      </div>

      {/* Quick Action Bulk Set Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 select-none">
        <span className="text-xs font-bold text-slate-600">
          Schnell-Aktion für {selectedDate === todayStr ? 'heute' : formatDateGerman(selectedDate)}:
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleBulkSetStatus('anwesend')}
            className="py-2 px-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-xl text-xs transition"
          >
            Alle als anwesend markieren ✅
          </button>
        </div>
      </div>

      {/* Children Attendance List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden select-none">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm">
            Liste ({gefilterteKinder.length} Kinder) &bull; Datum: {formatDateGerman(selectedDate)}
          </h3>
          <span className="text-xs text-slate-400">
            Tippe einfach auf den gewünschten Status pro Kind
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {gefilterteKinder.map((kind) => {
            const eintrag = attendanceMap.get(kind.id);
            const status: AnwesenheitsStatus | undefined = eintrag?.status;

            return (
              <div
                key={kind.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition"
              >
                {/* Child Name & Group */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-800 text-base">{kind.vorname}</span>
                    <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-0.5 rounded-full font-bold">
                      {kind.gruppe}
                    </span>
                    {kind.besonderheiten && (
                      <span className="text-xs text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                        ⚠️ {kind.besonderheiten}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Toggle Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleSetStatus(kind.id, 'anwesend')}
                    className={`py-2 px-3 rounded-xl font-extrabold text-xs transition focus:outline-none ${
                      status === 'anwesend'
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30 scale-105'
                        : 'bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700'
                    }`}
                  >
                    Anwesend ✅
                  </button>

                  <button
                    onClick={() => handleSetStatus(kind.id, 'krank')}
                    className={`py-2 px-3 rounded-xl font-extrabold text-xs transition focus:outline-none ${
                      status === 'krank'
                        ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/30 scale-105'
                        : 'bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700'
                    }`}
                  >
                    Krank 🤒
                  </button>

                  <button
                    onClick={() => handleSetStatus(kind.id, 'urlaub')}
                    className={`py-2 px-3 rounded-xl font-extrabold text-xs transition focus:outline-none ${
                      status === 'urlaub'
                        ? 'bg-sky-500 text-white shadow-sm ring-2 ring-sky-500/30 scale-105'
                        : 'bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-700'
                    }`}
                  >
                    Urlaub 🏖️
                  </button>

                  <button
                    onClick={() => handleSetStatus(kind.id, 'fehlt')}
                    className={`py-2 px-3 rounded-xl font-extrabold text-xs transition focus:outline-none ${
                      status === 'fehlt'
                        ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30 scale-105'
                        : 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700'
                    }`}
                  >
                    Fehlt ❌
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
