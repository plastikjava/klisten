'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Listenvorlage } from '@/types';
import { vorlageSpeichern, vorlageLoeschen } from '@/lib/db-operations';
import { useToast } from '@/components/Toast';

import VorlageEditFormular from './components/VorlageEditFormular';
import VorlageStatischDialog from './components/VorlageStatischDialog';
import VorlageDruckenDialog from './components/VorlageDruckenDialog';

export default function VorlagenPage() {
  const { showToast } = useToast();

  // Queries saved active templates from IndexedDB
  const vorlagen = useLiveQuery(() => db.vorlagen.filter((v) => !v.geloescht).toArray()) || [];

  // Edit metadata modal states (Dynamic filter templates)
  const [selectedVorlage, setSelectedVorlage] = useState<Listenvorlage | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Static list modal states
  const [isStaticOpen, setIsStaticOpen] = useState(false);

  // Print list modal states
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printVorlage, setPrintVorlage] = useState<Listenvorlage | null>(null);

  const handleEditRequest = (v: Listenvorlage) => {
    setSelectedVorlage(v);
    if (v.istStatisch) {
      setIsStaticOpen(true);
    } else {
      setIsEditOpen(true);
    }
  };

  const handleCreateStaticRequest = () => {
    setSelectedVorlage(null);
    setIsStaticOpen(true);
  };

  const handlePrintRequest = (v: Listenvorlage) => {
    setPrintVorlage(v);
    setIsPrintOpen(true);
  };

  const handleSaveEdit = async (updated: Listenvorlage) => {
    try {
      await vorlageSpeichern(updated);
      showToast(`Vorlage '${updated.name}' erfolgreich aktualisiert.`, 'success');
      setIsEditOpen(false);
      setSelectedVorlage(null);
    } catch (e: any) {
      showToast(e.message || 'Fehler beim Speichern.', 'error');
    }
  };

  const handleSaveStatic = async (name: string, beschreibung: string, kinderIds: string[], isNew: boolean) => {
    try {
      if (isNew) {
        const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        const neu: Listenvorlage = {
          id: uuid,
          name,
          beschreibung: beschreibung || undefined,
          istStatisch: true,
          kinderIds,
          erstelltAm: new Date().toISOString(),
          geaendertAm: new Date().toISOString()
        };
        await vorlageSpeichern(neu);
        showToast(`Feste Liste '${name}' erfolgreich erstellt.`, 'success');
      } else if (selectedVorlage) {
        const updated: Listenvorlage = {
          ...selectedVorlage,
          name,
          beschreibung: beschreibung || undefined,
          kinderIds,
          geaendertAm: new Date().toISOString()
        };
        await vorlageSpeichern(updated);
        showToast(`Feste Liste '${name}' erfolgreich aktualisiert.`, 'success');
      }
      setIsStaticOpen(false);
      setSelectedVorlage(null);
    } catch (e: any) {
      showToast(e.message || 'Fehler beim Speichern der festen Liste.', 'error');
    }
  };

  const handleDeleteRequest = async (v: Listenvorlage) => {
    const confirmationText = v.istStatisch 
      ? `Möchtest du die feste Liste '${v.name}' wirklich löschen? Dadurch wird auch die Historie dieser Liste gelöscht.`
      : `Möchtest du die Vorlage '${v.name}' wirklich löschen? Dadurch wird auch die Historie dieser Vorlage gelöscht.`;

    if (!window.confirm(confirmationText)) {
      return;
    }
    
    try {
      await vorlageLoeschen(v.id);
      showToast(`Liste '${v.name}' erfolgreich gelöscht.`, 'success');
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
  const filterZusammenfassung = (v: Listenvorlage) => {
    if (v.istStatisch) {
      const count = v.kinderIds?.length || 0;
      return `Feste Zuteilung • ${count} ${count === 1 ? 'Kind' : 'Kinder'}`;
    }

    const f = v.filterOptionen;
    if (!f) return 'Dynamische Liste';

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
      <div className="select-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            📚 Vorlagen-Manager
          </h1>
          <p className="text-slate-500 text-sm md:text-base mt-1">
            Verwalte deine Aktivitätenvorlagen und festen Gruppenlisten, oder drucke leere Anwesenheitslisten aus.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 shrink-0 self-stretch sm:self-auto">
          <button
            onClick={handleCreateStaticRequest}
            className="py-3 px-5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-2xl shadow-sm text-sm transition focus:outline-none flex items-center justify-center gap-1.5"
          >
            👥 Feste Liste erstellen
          </button>
          
          <Link
            href="/listen"
            className="py-3 px-5 bg-[#4A90D9] hover:bg-[#357ABD] text-white font-extrabold rounded-2xl shadow-sm text-sm transition focus:outline-none flex items-center justify-center gap-1.5"
          >
            📋 Neue Filter-Vorlage
          </Link>
        </div>
      </div>

      {/* Templates Grid Grid */}
      {vorlagen.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center space-y-4 shadow-sm select-none">
          <div className="text-6xl">📚👥</div>
          <h3 className="text-xl font-bold text-slate-700">Keine Vorlagen gespeichert</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
            Vorlagen helfen dir, feste Gruppen (statische Listen) oder wiederkehrende Aktivitäten mit bestimmten Filtern (dynamische Listen) dauerhaft zu speichern.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row justify-center gap-2">
            <button
              onClick={handleCreateStaticRequest}
              className="py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm text-sm transition"
            >
              👥 Feste Gruppenliste erstellen
            </button>
            <Link
              href="/listen"
              className="py-3 px-6 bg-[#4A90D9] hover:bg-[#357ABD] text-white font-bold rounded-xl shadow-sm text-sm transition"
            >
              📋 Dynamische Vorlage erstellen
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
                  <span className={`shrink-0 inline-flex items-center justify-center text-xs font-bold px-2.5 py-1 rounded-full ${
                    v.istStatisch 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {v.istStatisch ? 'Feste Liste' : 'Filter-Vorlage'}
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

                {/* Filter / List info box */}
                <div className={`p-3 rounded-xl text-xs font-semibold ${
                  v.istStatisch 
                    ? 'bg-purple-50/40 border border-purple-100/30 text-purple-900' 
                    : 'bg-[#FAFAF5] border border-slate-200/50 text-slate-600'
                }`}>
                  <span className={`font-bold block text-[10px] uppercase tracking-wider mb-0.5 ${
                    v.istStatisch ? 'text-purple-400' : 'text-slate-400'
                  }`}>
                    {v.istStatisch ? 'Mitglieder' : 'Filterkriterien'}
                  </span>
                  {filterZusammenfassung(v)}
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
                    onClick={() => handlePrintRequest(v)}
                    className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-purple-600 hover:border-purple-200 rounded-xl transition focus:outline-none"
                    title="Liste drucken mit leeren Ankreuz-Spalten"
                  >
                    🖨️
                  </button>
                  <button
                    onClick={() => handleEditRequest(v)}
                    className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-purple-600 hover:border-purple-200 rounded-xl transition focus:outline-none"
                    title={v.istStatisch ? 'Feste Liste bearbeiten' : 'Name/Beschreibung bearbeiten'}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteRequest(v)}
                    className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 rounded-xl transition focus:outline-none"
                    title="Liste löschen"
                  >
                    🗑️
                  </button>
                </div>

                <Link
                  href={`/listen?vorlagenId=${v.id}`}
                  className={`py-2.5 px-4 text-white font-bold rounded-xl shadow-sm text-sm transition focus:outline-none flex items-center gap-1.5 ${
                    v.istStatisch 
                      ? 'bg-purple-600 hover:bg-purple-700' 
                      : 'bg-[#4A90D9] hover:bg-[#357ABD]'
                  }`}
                >
                  {v.istStatisch ? '👥 Anzeigen' : '📋 Liste erstellen'}
                </Link>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Edit Metadata Modal (Dynamic Templates) */}
      <VorlageEditFormular
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedVorlage(null);
        }}
        vorlage={selectedVorlage}
        onSave={handleSaveEdit}
      />

      {/* Create/Edit Static List Modal */}
      <VorlageStatischDialog
        isOpen={isStaticOpen}
        onClose={() => {
          setIsStaticOpen(false);
          setSelectedVorlage(null);
        }}
        vorlage={selectedVorlage}
        onSave={handleSaveStatic}
      />

      {/* Print List Dialog Modal with Empty Columns Config */}
      <VorlageDruckenDialog
        isOpen={isPrintOpen}
        onClose={() => {
          setIsPrintOpen(false);
          setPrintVorlage(null);
        }}
        vorlage={printVorlage}
      />

    </div>
  );
}
