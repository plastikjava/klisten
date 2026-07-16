'use client';

import React from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

export default function Home() {
  // Query database to get live counts
  const kinderAnzahl = useLiveQuery(() => db.kinder.count());
  const gruppenAnzahl = useLiveQuery(async () => {
    const kinder = await db.kinder.toArray();
    const gruppenSet = new Set(kinder.map((k) => k.gruppe).filter(g => g && g.trim() !== ''));
    return gruppenSet.size;
  });
  const vorlagenAnzahl = useLiveQuery(() => db.vorlagen.count());

  return (
    <div className="space-y-10 py-4 animate-in fade-in duration-200">
      
      {/* Welcome Banner */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-800 sm:text-5xl">
          Hallo in der Kita! 👋
        </h1>
        <p className="text-lg md:text-xl text-slate-500 leading-relaxed">
          Kita-Listen hilft dir, Aktivitäten- und Gruppenlisten schnell zu erstellen. 
          Alle Daten werden <strong>zu 100% lokal</strong> auf deinem Gerät gespeichert.
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="text-2xl md:text-3xl font-black text-[#4A90D9]">
            {kinderAnzahl !== undefined ? kinderAnzahl : '...'}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-1">Kinder eingetragen</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="text-2xl md:text-3xl font-black text-[#F5A623]">
            {gruppenAnzahl !== undefined ? gruppenAnzahl : '...'}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-1">Aktive Gruppen</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="text-2xl md:text-3xl font-black text-[#9333EA]">
            {vorlagenAnzahl !== undefined ? vorlagenAnzahl : '...'}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-1">Gespeicherte Vorlagen</div>
        </div>
      </div>

      {/* Main Navigation Tiles - Large Touch Targets for Tablets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto pt-4">
        
        {/* Manage Kids Tile */}
        <Link 
          href="/kinder"
          className="group bg-white hover:bg-sky-50/40 p-8 rounded-3xl border border-slate-100 hover:border-sky-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center space-y-4 focus:outline-none focus:ring-4 focus:ring-sky-100"
        >
          <div className="text-5xl p-5 bg-sky-50 rounded-2xl group-hover:scale-105 transition-transform duration-300">
            🧒
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-800">Kinder verwalten</h2>
            <p className="text-slate-500 text-xs md:text-sm max-w-xs">
              Füge neue Kinder hinzu, bearbeite Profile oder lösche Einträge.
            </p>
          </div>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 text-[#4A90D9] font-bold text-xs md:text-sm group-hover:translate-x-1 transition-transform">
              Zum Daten-Manager &rarr;
            </span>
          </div>
        </Link>

        {/* Generate List Tile */}
        <Link 
          href="/listen"
          className="group bg-white hover:bg-amber-50/40 p-8 rounded-3xl border border-slate-100 hover:border-amber-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center space-y-4 focus:outline-none focus:ring-4 focus:ring-amber-100"
        >
          <div className="text-5xl p-5 bg-amber-50 rounded-2xl group-hover:scale-105 transition-transform duration-300">
            📋
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-800">Liste erstellen</h2>
            <p className="text-slate-500 text-xs md:text-sm max-w-xs">
              Filtere Kinder nach Gruppe oder Alter, nutze manuelle Auswahl und PDF-Export.
            </p>
          </div>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 text-[#F5A623] font-bold text-xs md:text-sm group-hover:translate-x-1 transition-transform">
              Zum Generator &rarr;
            </span>
          </div>
        </Link>

        {/* Templates Tile */}
        <Link 
          href="/vorlagen"
          className="group bg-white hover:bg-purple-50/40 p-8 rounded-3xl border border-slate-100 hover:border-purple-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center space-y-4 focus:outline-none focus:ring-4 focus:ring-purple-100 md:col-span-2 lg:col-span-1"
        >
          <div className="text-5xl p-5 bg-purple-50 rounded-2xl group-hover:scale-105 transition-transform duration-300">
            📚
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-800">Vorlagen laden</h2>
            <p className="text-slate-500 text-xs md:text-sm max-w-xs">
              Öffne Vorlagen (z.B. Vorlese-Oma) mit eigenständiger Rotationshistorie.
            </p>
          </div>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 text-purple-600 font-bold text-xs md:text-sm group-hover:translate-x-1 transition-transform">
              Zu deinen Vorlagen &rarr;
            </span>
          </div>
        </Link>

      </div>

      {/* Info Warning Banner */}
      <div className="bg-slate-100/60 max-w-2xl mx-auto p-4 rounded-xl border border-slate-200/40 flex items-start gap-3">
        <span className="text-xl mt-0.5" role="img" aria-label="Info info">ℹ️</span>
        <p className="text-xs text-slate-500 leading-relaxed">
          Diese App speichert personenbezogene Daten ausschließlich in der lokalen Datenbank (IndexedDB) deines Browsers. 
          Löschst du den Browser-Verlauf oder deine Website-Daten, können die Daten verloren gehen. 
          Nutze daher die <strong>Datensicherung</strong> im Menü oben, um regelmäßige Backups zu erstellen.
        </p>
      </div>

    </div>
  );
}
