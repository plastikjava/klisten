'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Listenvorlage, FilterOptionen } from '@/types';
import { vorlageSpeichern, vorlageLoeschen } from '@/lib/db-operations';
import { useToast } from '@/components/Toast';

import VorlageEditFormular from './components/VorlageEditFormular';

export default function VorlagenPage() {
  const { showToast } = useToast();
  const router = useRouter();

  // Queries saved templates from IndexedDB
  const vorlagen = useLiveQuery(() => db.vorlagen.toArray()) || [];

  // Edit modal states
  const [selectedVorlage, setSelectedVorlage] = useState<Listenvorlage | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleEditRequest = (v: Listenvorlage) => {
    setSelectedVorlage(v);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (updated: Listenvorlage) => {
    try {
      await vorlageSpeichern(updated);
      showToast(`Vorlage '${updated.name}' erfolgreich aktualisiert.`, 'success');
      setIsEditOpen(false);
    } catch (e: any) {
      showToast(e.message || 'Fehler beim Speichern.', 'error');
    }
  };

  const handleDeleteRequest = async (v: Listenvorlage) => {
    if (!window.confirm(`Möchtest du die Vorlage '${v.name}' wirklich löschen? Dadurch wird auch die Historie dieser Vorlage gelöscht.`)) {
      return;
    }
    
    try {
      await vorlageLoeschen(v.id);
      showToast(`Vorlage '${v.name}' erfolgreich gelöscht.`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Löschen fehlgeschlagen.', 'error');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'nie';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Helper to construct filter details text on cards
  const filterZusammenfassung = (f: FilterOptionen) => {
    const parts = [];
    
    if (f.gruppen.length > 0) {
      parts.push(`Gruppen: ${f.gruppen.join(', ')}`);
    } else {
      parts.push('Alle Gruppen');
    }

    if (f.alterVon !== undefined && f.alterBis !== undefined) {
      parts.push(`Alter: ${f.alterVon}-${f.alterBis} J.`);
    } else if (f.alterVon !== undefined) {
      parts.push(`Alter: ab ${f.alterVon} J.`);
    } else if (f.alterBis !== undefined) {
      parts.push(`Alter: bis ${f.alterBis} J.`);
    }

    if (f.anzahl !== undefined && f.anzahl > 0) {
      parts.push(`Limit: ${f.anzahl} Kinder`);
    }

    return parts.join(' • ');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Page Header */}
      <div className="select-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            📚 Vorlagen-Manager
          </h1>
          <p className="text-slate-500 text-sm md:text-base mt-1">
            Verwalte deine gespeicherten Aktivitätenvorlagen, benenne sie um oder starte direkt eine neue Liste.
          </p>
        </div>
        
        <Link
          href="/listen"
          className="py-3 px-6 bg-[#4A90D9] hover:bg-[#357ABD] text-white font-extrabold rounded-2xl shadow-sm text-base transition focus:outline-none flex items-center justify-center gap-2 shrink-0 self-stretch sm:self-auto"
        >
          <span>➕</span> Neue Vorlage erstellen
        </Link>
      </div>

      {/* Templates Grid Grid */}
      {vorlagen.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center space-y-4 shadow-sm select-none">
          <div className="text-6xl">📚🔍</div>
          <h3 className="text-xl font-bold text-slate-700">Keine Vorlagen gespeichert</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
            Vorlagen helfen dir, wiederkehrende Termine (wie z.B. Turnen oder Vorlesetage) mit festen Filtern abzuspeichern. 
            Erstelle eine Vorlage, indem du im Listengenerator Filter auswählst und auf <strong>„Als Vorlage speichern“</strong> klickst.
          </p>
          <div className="pt-2">
            <Link
              href="/listen"
              className="inline-flex py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm text-sm transition"
            >
              Jetzt zum Listengenerator &rarr;
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 select-none">
          {vorlagen.map((v) => (
            <div
              key={v.id}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden"
            >
              {/* Card Body */}
              <div className="p-6 space-y-4">
                
                {/* Header title */}
                <div className="flex justify-between items-start gap-4">
                  <h2 className="text-xl font-black text-slate-800 truncate" title={v.name}>
                    {v.name}
                  </h2>
                  <span className="shrink-0 inline-flex items-center justify-center bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full">
                    Aktivität
                  </span>
                </div>

                {/* Description */}
                {v.beschreibung ? (
                  <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed min-h-[4.5rem]">
                    {v.beschreibung}
                  </p>
                ) : (
                  <p className="text-sm text-slate-300 italic min-h-[4.5rem]">Keine Beschreibung hinterlegt.</p>
                )}

                {/* Filter info box */}
                <div className="bg-[#FAFAF5] border border-slate-200/50 p-3 rounded-xl text-xs font-semibold text-slate-600">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider mb-0.5">Filterkriterien</span>
                  {filterZusammenfassung(v.filterOptionen)}
                </div>

                {/* Usage statistics info */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>Zuletzt genutzt:</span>
                  <span className="font-bold text-slate-600">{formatDate(v.zuletztVerwendetAm)}</span>
                </div>

              </div>

              {/* Card Footer Actions */}
              <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleEditRequest(v)}
                    className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-purple-600 hover:border-purple-200 rounded-xl transition focus:outline-none"
                    title="Name/Beschreibung bearbeiten"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteRequest(v)}
                    className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 rounded-xl transition focus:outline-none"
                    title="Vorlage löschen"
                  >
                    🗑️
                  </button>
                </div>

                <Link
                  href={`/listen?vorlagenId=${v.id}`}
                  className="py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm text-sm transition focus:outline-none flex items-center gap-1.5"
                >
                  📋 Liste erstellen
                </Link>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Edit Form Dialog Modal */}
      <VorlageEditFormular
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedVorlage(null);
        }}
        vorlage={selectedVorlage}
        onSave={handleSaveEdit}
      />

    </div>
  );
}
