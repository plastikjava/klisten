'use client';

import React, { useState } from 'react';
import { Kind, Notfallkontakt } from '@/types';
import { formatierteAltersAngabe } from '@/lib/alter';

interface KinderListeProps {
  kinder: Kind[];
  onEdit: (kind: Kind) => void;
  onDeleteRequest: (kind: Kind) => void;
}

export default function KinderListe({ kinder, onEdit, onDeleteRequest }: KinderListeProps) {
  // Emergency contact modal state
  const [activeContactKind, setActiveContactKind] = useState<Kind | null>(null);
  const [pwInput, setPwInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pwError, setPwError] = useState('');

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleOpenContacts = (kind: Kind) => {
    setActiveContactKind(kind);
    setPwInput('');
    setPwError('');
    setIsUnlocked(false);
  };

  const handleUnlockContacts = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwInput === '1248') {
      setIsUnlocked(true);
      setPwError('');
    } else {
      setPwError('Falsches Passwort! (Tipp: 1248)');
    }
  };

  if (kinder.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center space-y-3 shadow-sm">
        <div className="text-5xl">🧒🔍</div>
        <h3 className="text-xl font-bold text-slate-700">Keine Kinder gefunden</h3>
        <p className="text-slate-500 text-sm max-w-sm mx-auto">
          Füge über den Button oben rechts dein erstes Kind hinzu oder passe deine Suche/Filter an.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        
        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm font-bold uppercase select-none">
                <th className="p-4 pl-6">Name</th>
                <th className="p-4">Gruppe</th>
                <th className="p-4">Alter</th>
                <th className="p-4">Letzte Aktivität</th>
                <th className="p-4">Besonderheiten</th>
                <th className="p-4 pr-6 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {kinder.map((kind) => {
                const alterText = formatierteAltersAngabe(kind.geburtsdatum);
                const hatNotfall = kind.notfallkontakte && kind.notfallkontakte.length > 0;
                
                return (
                  <tr 
                    key={kind.id} 
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* Name */}
                    <td className="p-4 pl-6 font-bold text-slate-800 text-base md:text-lg">
                      <div className="flex items-center gap-2">
                        {kind.vorname}
                        {kind.besonderheiten && (
                          <span 
                            title={`Besonderheit: ${kind.besonderheiten}`}
                            className="cursor-help inline-flex items-center justify-center bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-bold"
                          >
                            ⚠️ {kind.besonderheiten}
                          </span>
                        )}
                      </div>
                    </td>
                    
                    {/* Gruppe */}
                    <td className="p-4 text-base">
                      <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-full font-semibold text-sm">
                        {kind.gruppe}
                      </span>
                    </td>
                    
                    {/* Alter */}
                    <td className="p-4 text-base">
                      <div className="flex flex-col">
                        <span className="font-semibold">{alterText}</span>
                        <span className="text-xs text-slate-400 font-normal">Geb. {formatDate(kind.geburtsdatum)}</span>
                      </div>
                    </td>
                    
                    {/* Letzte Aktivität */}
                    <td className="p-4 text-base text-slate-500">
                      {kind.letzteAktivitaetAm ? formatDate(kind.letzteAktivitaetAm) : '-'}
                    </td>
                    
                    {/* Besonderheiten / Emergency quick badge */}
                    <td className="p-4 text-sm text-slate-500 max-w-xs">
                      {hatNotfall ? (
                        <button
                          onClick={() => handleOpenContacts(kind)}
                          className="py-1 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 focus:outline-none"
                        >
                          <span>📞 Notfallkontakt ({kind.notfallkontakte?.length})</span>
                          <span className="text-[10px] text-emerald-500">🔒</span>
                        </button>
                      ) : (
                        <span className="text-slate-300 italic text-xs">Kein Notfallkontakt</span>
                      )}
                    </td>
                    
                    {/* Actions */}
                    <td className="p-4 pr-6 text-right">
                      <div className="inline-flex items-center gap-1">
                        {hatNotfall && (
                          <button
                            onClick={() => handleOpenContacts(kind)}
                            className="p-2.5 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 rounded-xl transition focus:outline-none"
                            title="Notfall-Telefonnummern anzeigen (PW 1248)"
                          >
                            <span className="text-xl md:text-2xl">📞</span>
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(kind)}
                          className="p-2.5 hover:bg-sky-50 text-[#4A90D9] hover:text-[#357ABD] rounded-xl transition focus:outline-none"
                          title="Bearbeiten"
                        >
                          <span className="text-xl md:text-2xl">✏️</span>
                        </button>
                        <button
                          onClick={() => onDeleteRequest(kind)}
                          className="p-2.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-xl transition focus:outline-none"
                          title="Löschen"
                        >
                          <span className="text-xl md:text-2xl">🗑️</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* Emergency Contacts Password Modal */}
      {activeContactKind && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="bg-emerald-600 p-5 text-white flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                📞 Notfallkontakte: {activeContactKind.vorname}
              </h2>
              <button 
                onClick={() => setActiveContactKind(null)}
                className="text-white/80 hover:text-white text-2xl font-bold focus:outline-none"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!isUnlocked ? (
                <form onSubmit={handleUnlockContacts} className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                    <p className="text-xs text-amber-900 font-bold">
                      🔒 Geschützter Notfallkontakt
                    </p>
                    <p className="text-xs text-amber-800">
                      Bitte gib das Passwort ein, um die Telefonnummern von {activeContactKind.vorname}s Eltern/Angehörigen zu sehen:
                    </p>
                    <input
                      type="password"
                      placeholder="Passwort eingeben"
                      value={pwInput}
                      onChange={(e) => setPwInput(e.target.value)}
                      className="w-full p-3 bg-white border border-amber-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                      autoFocus
                    />
                    {pwError && <p className="text-xs text-rose-600 font-bold">{pwError}</p>}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveContactKind(null)}
                      className="py-2.5 px-4 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md"
                    >
                      🔓 Freischalten
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 font-semibold">
                    Direkt antippen zum Anrufen:
                  </p>
                  
                  {activeContactKind.notfallkontakte?.map((kontakt, idx) => (
                    <a
                      key={idx}
                      href={`tel:${kontakt.telefon}`}
                      className="flex items-center justify-between p-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl transition group"
                    >
                      <div>
                        <span className="text-xs text-emerald-800 font-extrabold block">
                          {kontakt.name || `Kontakt ${idx + 1}`}
                        </span>
                        <span className="text-base font-black text-emerald-900 tracking-wide">
                          {kontakt.telefon}
                        </span>
                      </div>
                      <span className="py-2 px-3 bg-emerald-600 group-hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1">
                        📞 Anrufen
                      </span>
                    </a>
                  ))}

                  <div className="pt-3 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => setActiveContactKind(null)}
                      className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
