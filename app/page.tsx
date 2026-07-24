'use client';

import React from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { berechneAlter, formatierteAltersAngabe } from '@/lib/alter';

export default function Home() {
  // Query database to get live counts
  const kinder = useLiveQuery(() => db.kinder.filter((k) => !k.geloescht).toArray()) || [];
  const vorlagen = useLiveQuery(() => db.vorlagen.filter((v) => !v.geloescht).toArray()) || [];
  
  const kinderAnzahl = kinder.length;
  const gruppenAnzahl = React.useMemo(() => {
    const set = new Set(kinder.map((k) => k.gruppe).filter(g => g && g.trim() !== ''));
    return set.size;
  }, [kinder]);
  const vorlagenAnzahl = vorlagen.length;

  // Calculate upcoming birthdays
  const birthdaySummary = React.useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDate = today.getDate();

    const todayBirthdays: { name: string; alter: number; gruppe: string }[] = [];
    const weekBirthdays: { name: string; dateStr: string; alter: number; gruppe: string }[] = [];
    const monthBirthdays: { name: string; dateStr: string; alter: number; gruppe: string }[] = [];

    kinder.forEach((kind) => {
      if (!kind.geburtsdatum) return;
      const birth = new Date(kind.geburtsdatum);
      const bMonth = birth.getMonth();
      const bDate = birth.getDate();

      const newAge = berechneAlter(kind.geburtsdatum) + (bMonth < currentMonth || (bMonth === currentMonth && bDate <= currentDate) ? 0 : 1);

      // Today
      if (bMonth === currentMonth && bDate === currentDate) {
        todayBirthdays.push({ name: kind.vorname, alter: newAge, gruppe: kind.gruppe });
      }

      // Calculate days until birthday this year
      let thisYearBday = new Date(today.getFullYear(), bMonth, bDate);
      if (thisYearBday < today && !(bMonth === currentMonth && bDate === currentDate)) {
        thisYearBday = new Date(today.getFullYear() + 1, bMonth, bDate);
      }

      const diffDays = Math.ceil((thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays > 0 && diffDays <= 7) {
        weekBirthdays.push({
          name: kind.vorname,
          dateStr: `${bDate}.${bMonth + 1}.`,
          alter: newAge,
          gruppe: kind.gruppe
        });
      } else if (bMonth === currentMonth && diffDays > 0) {
        monthBirthdays.push({
          name: kind.vorname,
          dateStr: `${bDate}.${bMonth + 1}.`,
          alter: newAge,
          gruppe: kind.gruppe
        });
      }
    });

    return { todayBirthdays, weekBirthdays, monthBirthdays };
  }, [kinder]);

  // Last 3 used templates / activities
  const recentTemplates = React.useMemo(() => {
    return [...vorlagen]
      .filter((v) => v.zuletztVerwendetAm)
      .sort((a, b) => (b.zuletztVerwendetAm || '').localeCompare(a.zuletztVerwendetAm || ''))
      .slice(0, 3);
  }, [vorlagen]);

  // Kids with special notes / allergies
  const kidsWithNotes = React.useMemo(() => {
    return kinder.filter((k) => k.besonderheiten && k.besonderheiten.trim() !== '');
  }, [kinder]);

  return (
    <div className="space-y-8 py-4 animate-in fade-in duration-200">
      
      {/* Welcome Banner */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 sm:text-4xl">
          Hallo in der Kita! 👋
        </h1>
        <p className="text-sm md:text-base text-slate-500 leading-relaxed">
          Deine lokale App für Kita-Listen, digitale Anwesenheit, Notfallkontakte & Geburtstage.
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="text-2xl md:text-3xl font-black text-[#4A90D9]">
            {kinderAnzahl}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-1">Kinder eingetragen</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="text-2xl md:text-3xl font-black text-[#F5A623]">
            {gruppenAnzahl}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-1">Aktive Gruppen</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="text-2xl md:text-3xl font-black text-[#9333EA]">
            {vorlagenAnzahl}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-1">Gespeicherte Vorlagen</div>
        </div>
      </div>

      {/* --- DASHBOARD WIDGETS SECTION --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        
        {/* Widget 1: 🎂 Geburtstags-Widget */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <span>🎂 Anstehende Geburtstage</span>
              </h2>
              <Link href="/geburtstage" className="text-xs font-bold text-purple-600 hover:underline">
                Kalender öffnen &rarr;
              </Link>
            </div>

            {/* Birthday Today Banner */}
            {birthdaySummary.todayBirthdays.length > 0 ? (
              <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-white p-4 rounded-2xl shadow-md animate-pulse">
                <div className="font-black text-base flex items-center gap-2">
                  <span>🎉 HEUTE GEBURTSTAG!</span>
                </div>
                <div className="mt-1 space-y-1">
                  {birthdaySummary.todayBirthdays.map((b, i) => (
                    <p key={i} className="text-sm font-bold">
                      {b.name} ({b.gruppe}) wird heute <span className="underline">{b.alter} Jahre</span> alt! 🎈
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Heute hat kein Kind Geburtstag.</p>
            )}

            {/* Birthdays this week */}
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Diese Woche:
              </span>
              {birthdaySummary.weekBirthdays.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Keine weiteren Geburtstage diese Woche.</p>
              ) : (
                <div className="space-y-1">
                  {birthdaySummary.weekBirthdays.map((b, i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-purple-50/60 rounded-xl text-xs">
                      <span className="font-bold text-purple-900">{b.name} ({b.gruppe})</span>
                      <span className="text-purple-700 font-semibold">{b.dateStr} &bull; wird {b.alter} Jahre</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Link
            href="/geburtstage"
            className="w-full py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-xl text-xs text-center transition block"
          >
            🎂 Vollständigen Geburtstags-Kalender anzeigen
          </Link>
        </div>

        {/* Widget 2: ⚡ Letzte Aktivitäten & Vorlagen */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <span>⚡ Zuletzt genutzte Aktivitäten</span>
              </h2>
              <Link href="/vorlagen" className="text-xs font-bold text-[#4A90D9] hover:underline">
                Alle Vorlagen &rarr;
              </Link>
            </div>

            {recentTemplates.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Noch keine Aktivitäten durchgeführt.</p>
            ) : (
              <div className="space-y-2">
                {recentTemplates.map((v) => (
                  <Link
                    key={v.id}
                    href={`/listen?vorlagenId=${v.id}`}
                    className="flex justify-between items-center p-3 bg-slate-50 hover:bg-sky-50/60 border border-slate-100 rounded-2xl transition group"
                  >
                    <div>
                      <span className="font-bold text-sm text-slate-800 group-hover:text-[#4A90D9] block">
                        {v.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        {v.istStatisch ? 'Feste Gruppe' : 'Dynamische Filterliste'}
                      </span>
                    </div>
                    <span className="py-1.5 px-3 bg-white border border-slate-200 text-[#4A90D9] font-bold text-xs rounded-xl shadow-xs group-hover:bg-[#4A90D9] group-hover:text-white transition">
                      Öffnen &rarr;
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/listen"
            className="w-full py-2.5 bg-sky-50 hover:bg-sky-100 text-[#4A90D9] font-bold rounded-xl text-xs text-center transition block"
          >
            📋 Neue Liste erstellen
          </Link>
        </div>

      </div>

      {/* Special Notes / Allergy Alert Box */}
      {kidsWithNotes.length > 0 && (
        <div className="max-w-5xl mx-auto bg-amber-50/80 border border-amber-200 rounded-3xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <span>⚠️ Besonderheiten & Allergien ({kidsWithNotes.length} Kinder):</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {kidsWithNotes.map((k) => (
              <span key={k.id} className="bg-white border border-amber-300 text-amber-900 text-xs px-3 py-1.5 rounded-xl font-bold shadow-xs">
                {k.vorname} ({k.gruppe}): <span className="font-semibold italic text-amber-800">{k.besonderheiten}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Navigation Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto pt-2">
        
        {/* Manage Kids Tile */}
        <Link 
          href="/kinder"
          className="group bg-white hover:bg-sky-50/40 p-6 rounded-3xl border border-slate-100 hover:border-sky-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center space-y-3 focus:outline-none"
        >
          <div className="text-4xl p-4 bg-sky-50 rounded-2xl group-hover:scale-105 transition-transform duration-300">
            🧒
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-800">Kinder verwalten</h2>
            <p className="text-slate-500 text-xs max-w-xs">
              Kinder hinzufügen, Notfallkontakte (PW 1248) & Profile verwalten.
            </p>
          </div>
        </Link>

        {/* Attendance Tile */}
        <Link 
          href="/anwesenheit"
          className="group bg-white hover:bg-emerald-50/40 p-6 rounded-3xl border border-slate-100 hover:border-emerald-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center space-y-3 focus:outline-none"
        >
          <div className="text-4xl p-4 bg-emerald-50 rounded-2xl group-hover:scale-105 transition-transform duration-300">
            📋
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-800">Digitale Anwesenheit</h2>
            <p className="text-slate-500 text-xs max-w-xs">
              Tages-Check-in pro Gruppe: Anwesend, Krank, Urlaub, Fehlt.
            </p>
          </div>
        </Link>

        {/* Generate List Tile */}
        <Link 
          href="/listen"
          className="group bg-white hover:bg-amber-50/40 p-6 rounded-3xl border border-slate-100 hover:border-amber-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center space-y-3 focus:outline-none"
        >
          <div className="text-4xl p-4 bg-amber-50 rounded-2xl group-hover:scale-105 transition-transform duration-300">
            ⚡
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-800">Liste erstellen</h2>
            <p className="text-slate-500 text-xs max-w-xs">
              Automatische Ziehung, Rotationslogik & A4-Druckansichten.
            </p>
          </div>
        </Link>

      </div>

      {/* Info Warning Banner */}
      <div className="bg-slate-100/60 max-w-2xl mx-auto p-4 rounded-xl border border-slate-200/40 flex items-start gap-3">
        <span className="text-xl mt-0.5" role="img" aria-label="Info info">ℹ️</span>
        <p className="text-xs text-slate-500 leading-relaxed">
          Diese App speichert Daten <strong>zu 100% lokal</strong> in deinem Browser und synchronisiert sie verschlüsselt (E2EE) mit deinen weiteren iPads.
        </p>
      </div>

    </div>
  );
}
