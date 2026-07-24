'use client';

import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { gruppenLaden } from '@/lib/db-operations';

const PRESETS = [
  {
    title: '☔ Gummistiefel & Regensachen',
    nachricht: 'Bitte geben Sie Ihrem Kind morgen Gummistiefel und wetterfeste Regenkleidung mit in die Kita.'
  },
  {
    title: '🎒 Kita-Ausflug',
    nachricht: 'Wir machen morgen einen Ausflug! Bitte geben Sie Ihrem Kind einen kleinen Rucksack mit Rucksack-Verpflegung (Trinkflasche & Snack) mit.'
  },
  {
    title: '👕 Wechselkleidung auffüllen',
    nachricht: 'Bitte überprüfen Sie das Wechselkleidungs-Fach Ihres Kindes und füllen Sie passende Kleidung (der Jahreszeit entsprechend) wieder auf.'
  },
  {
    title: '☀️ Sonnenschutz & Kappe',
    nachricht: 'Bitte cremen Sie Ihr Kind morgens zu Hause mit Sonnencreme ein und geben Sie einen Sonnenhut/Kappe mit.'
  }
];

export default function InfozettelPage() {
  const [selectedGruppe, setSelectedGruppe] = useState<string>('ALLE');
  const [betreff, setBetreff] = useState<string>('Information für die Eltern');
  const [nachricht, setNachricht] = useState<string>(PRESETS[0].nachricht);

  const kinder = useLiveQuery(() => db.kinder.filter((k) => !k.geloescht).toArray()) || [];
  const gruppen = useLiveQuery(() => gruppenLaden()) || [];

  const targetKids = useMemo(() => {
    let result = [...kinder];
    if (selectedGruppe !== 'ALLE') {
      result = result.filter((k) => k.gruppe === selectedGruppe);
    }
    return result.sort((a, b) => a.vorname.localeCompare(b.vorname, 'de'));
  }, [kinder, selectedGruppe]);

  const heuteStr = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const handleApplyPreset = (p: typeof PRESETS[0]) => {
    setBetreff(p.title.replace(/^[^\s]+\s/, ''));
    setNachricht(p.nachricht);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="no-print select-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            ✉️ Eltern-Infozettel drucken
          </h1>
          <p className="text-slate-500 text-sm md:text-base mt-1">
            Erstelle schnell personalisierte Infozettel (4 Streifen pro A4-Seite zum Ausschneiden).
          </p>
        </div>

        <button
          onClick={handlePrint}
          disabled={targetKids.length === 0}
          className="py-3.5 px-6 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-2xl shadow-md text-sm transition flex items-center gap-2 self-start md:self-auto disabled:opacity-40"
        >
          🖨️ Infozettel jetzt drucken ({targetKids.length} Kinder)
        </button>
      </div>

      {/* Configuration Form */}
      <div className="no-print bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5 select-none">
        
        {/* Group Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Empfänger-Gruppe auswählen
          </label>
          <select
            value={selectedGruppe}
            onChange={(e) => setSelectedGruppe(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600/30"
          >
            <option value="ALLE">Alle Gruppen ({kinder.length} Kinder)</option>
            {gruppen.map((g) => (
              <option key={g} value={g}>
                Gruppe: {g}
              </option>
            ))}
          </select>
        </div>

        {/* Presets Bar */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Schnell-Vorlagen
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold transition"
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Betreff / Titel des Zettels
          </label>
          <input
            type="text"
            value={betreff}
            onChange={(e) => setBetreff(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600/30"
          />
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Nachricht an die Eltern
          </label>
          <textarea
            rows={3}
            value={nachricht}
            onChange={(e) => setNachricht(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600/30"
          />
        </div>

      </div>

      {/* Screen Preview */}
      <div className="no-print bg-slate-100/60 p-6 rounded-3xl border border-slate-200/60 space-y-3">
        <h3 className="font-extrabold text-slate-700 text-sm">Vorschau für Elternzettel:</h3>
        
        <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xs space-y-2 max-w-lg">
          <div className="flex justify-between items-center border-b pb-1 text-xs text-slate-500">
            <span className="font-bold text-purple-700">Liebe Eltern von [Vorname des Kindes]</span>
            <span>Datum: {heuteStr}</span>
          </div>
          <h4 className="font-bold text-slate-900 text-sm">{betreff}</h4>
          <p className="text-xs text-slate-700 leading-relaxed">{nachricht}</p>
          <div className="pt-2 text-[10px] text-slate-400 border-t flex justify-between">
            <span>Kita-Listen</span>
            <span>Gruppe: [Gruppenname]</span>
          </div>
        </div>
      </div>

      {/* --- PRINTABLE HTML (4 Personalised Slips per A4 Page) --- */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
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
          .slip-box {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="hidden print-clean-page w-full text-black bg-white select-none">
        <div className="grid grid-cols-1 gap-4">
          {targetKids.map((kind) => (
            <div key={kind.id} className="slip-box border-2 border-dashed border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="flex justify-between items-center border-b-2 border-slate-800 pb-1">
                <span className="font-black text-base">Liebe Eltern von <u className="text-black">{kind.vorname}</u></span>
                <span className="text-xs font-semibold">Datum: {heuteStr}</span>
              </div>
              <h3 className="font-extrabold text-sm uppercase tracking-wide">{betreff}</h3>
              <p className="text-xs text-slate-900 leading-relaxed">{nachricht}</p>
              <div className="pt-2 text-[10px] text-slate-600 border-t border-slate-300 flex justify-between items-center">
                <span>Kita-Listen Info-Zettel</span>
                <span>Gruppe: <strong>{kind.gruppe}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
