'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { FilterOptionen, Kind, Listenvorlage } from '@/types';
import { 
  gruppenLaden, 
  vorlageSpeichern, 
  vorlageLoeschen, 
  letzteAktivitaetProKindFuerAlleVorlagen,
  aktivitaetenMarkieren,
  aktivitaetFuerVorlageMarkieren,
  kindAktualisieren
} from '@/lib/db-operations';
import { kinderFiltern, kinderAuswaehlen } from '@/lib/listengenerator';
import { formatierteAltersAngabe } from '@/lib/alter';
import { useToast } from '@/components/Toast';

import FilterPanel from './components/FilterPanel';
import ErgebnisListe from './components/ErgebnisListe';
import DruckAnsicht from './components/DruckAnsicht';
import VorlagenLeiste from './components/VorlagenLeiste';
import VorlageSpeichernDialog from './components/VorlageSpeichernDialog';
import KinderAuswahlTabelle from './components/KinderAuswahlTabelle';
import KindFormular from '@/app/kinder/components/KindFormular';

type Phase = 'statisch_mitglieder' | 'filter' | 'auswahl' | 'ergebnis';

function ListenPageContent() {
  const { showToast } = useToast();

  // 1. Live Queries from DB
  const allKinder = useLiveQuery(() => db.kinder.filter((k) => !k.geloescht).toArray()) || [];
  const gruppen = useLiveQuery(() => gruppenLaden()) || [];
  const vorlagen = useLiveQuery(() => db.vorlagen.filter((v) => !v.geloescht).toArray()) || [];
  
  // Live map of activity logs: templateId -> Map<kindId, dateStr>
  const aktivitaetsLogMap = useLiveQuery(async () => {
    return await letzteAktivitaetProKindFuerAlleVorlagen();
  }) || new Map<string, Map<string, string>>();

  // 2. State Management
  const [phase, setPhase] = useState<Phase>('filter');
  const [aktiveVorlage, setAktiveVorlage] = useState<Listenvorlage | null>(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

  // Edit kid modal state inside static list view
  const [editingKind, setEditingKind] = useState<Kind | undefined>(undefined);
  const [isEditKindOpen, setIsEditKindOpen] = useState(false);

  // URL param loader state
  const searchParams = useSearchParams();
  const paramVorlagenId = searchParams.get('vorlagenId');
  const [loadedFromParam, setLoadedFromParam] = useState(false);

  useEffect(() => {
    if (paramVorlagenId && vorlagen.length > 0 && allKinder.length > 0 && !loadedFromParam) {
      const found = vorlagen.find((v) => v.id === paramVorlagenId);
      if (found) {
        setAktiveVorlage(found);
        setLoadedFromParam(true);
        
        if (found.istStatisch) {
          // Static list flow: open direct member view first!
          const pool = allKinder.filter((k) => found.kinderIds?.includes(k.id));
          setGefiltertePool(pool);
          setPhase('statisch_mitglieder');
        } else if (found.filterOptionen) {
          // Dynamic template flow
          setFilter(found.filterOptionen);
          const pool = kinderFiltern(allKinder, found.filterOptionen);
          setGefiltertePool(pool);
          setPhase('auswahl');
        }
        
        showToast(`Liste '${found.name}' geladen.`, 'success');
      }
    }
  }, [paramVorlagenId, vorlagen, allKinder, loadedFromParam, showToast]);

  // Filter criteria states
  const [filter, setFilter] = useState<FilterOptionen>({
    alterVon: undefined,
    alterBis: undefined,
    gruppen: [],
    anzahl: 6, // Default target size
    zufallsauswahl: true // Default selection mode
  });

  // Flow datasets
  const [gefiltertePool, setGefiltertePool] = useState<Kind[]>([]);
  const [manuellGewaehltIds, setManuellGewaehltIds] = useState<string[]>([]);
  const [generierteKinder, setGenerierteKinder] = useState<Kind[]>([]);
  const [filterInfoText, setFilterInfoText] = useState('');

  // 3. Select a saved template from selector bar
  const handleSelectVorlage = (v: Listenvorlage | null) => {
    setAktiveVorlage(v);
    setGenerierteKinder([]);
    setManuellGewaehltIds([]);
    
    if (v) {
      if (v.istStatisch) {
        // Static list flow: open direct member view first!
        const pool = allKinder.filter((k) => v.kinderIds?.includes(k.id));
        setGefiltertePool(pool);
        setPhase('statisch_mitglieder');
      } else if (v.filterOptionen) {
        // Dynamic template flow
        setFilter(v.filterOptionen);
        setPhase('filter');
      }
      showToast(`Vorlage '${v.name}' geladen.`, 'success');
    } else {
      // Reset filter state to default
      setPhase('filter');
      setFilter({
        alterVon: undefined,
        alterBis: undefined,
        gruppen: [],
        anzahl: 6,
        zufallsauswahl: true
      });
    }
  };

  // Handler for editing a child in direct static member view
  const handleEditKindRequest = (kind: Kind) => {
    setEditingKind(kind);
    setIsEditKindOpen(true);
  };

  const handleSaveKind = async (data: Omit<Kind, 'id' | 'geaendertAm'>) => {
    if (!editingKind) return;
    try {
      await kindAktualisieren(editingKind.id, data);
      showToast(`Kind '${data.vorname}' erfolgreich aktualisiert.`, 'success');
      setIsEditKindOpen(false);
      setEditingKind(undefined);
    } catch (err: any) {
      showToast(err.message || 'Fehler beim Bearbeiten des Kindes.', 'error');
    }
  };

  // Save template handler
  const handleSaveVorlage = async (name: string, updateExisting: boolean, beschreibung?: string) => {
    try {
      if (updateExisting && aktiveVorlage) {
        const updated: Listenvorlage = {
          ...aktiveVorlage,
          filterOptionen: filter,
          zuletztVerwendetAm: aktiveVorlage.zuletztVerwendetAm
        };
        await vorlageSpeichern(updated);
        setAktiveVorlage(updated);
        showToast(`Vorlage '${updated.name}' aktualisiert.`, 'success');
      } else {
        const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        const neu: Listenvorlage = {
          id: uuid,
          name,
          beschreibung,
          filterOptionen: filter,
          istStatisch: false,
          erstelltAm: new Date().toISOString(),
          geaendertAm: new Date().toISOString()
        };
        await vorlageSpeichern(neu);
        setAktiveVorlage(neu);
        showToast(`Vorlage '${neu.name}' erfolgreich gespeichert!`, 'success');
      }
      setIsSaveDialogOpen(false);
    } catch (error: any) {
      showToast(error.message || 'Speichern der Vorlage fehlgeschlagen.', 'error');
    }
  };

  // Delete template handler
  const handleDeleteVorlage = async (v: Listenvorlage) => {
    if (!window.confirm(`Möchtest du die Vorlage '${v.name}' wirklich löschen?`)) {
      return;
    }
    
    try {
      await vorlageLoeschen(v.id);
      showToast(`Vorlage '${v.name}' gelöscht.`, 'success');
      if (aktiveVorlage?.id === v.id) {
        setAktiveVorlage(null);
      }
    } catch (error: any) {
      showToast(error.message || 'Löschen der Vorlage fehlgeschlagen.', 'error');
    }
  };

  // Generate filter pool and go to Phase 2 (Selection Table)
  const handleStartSelection = () => {
    if (allKinder.length === 0) {
      showToast('Es sind noch keine Kinder in der Datenbank eingetragen.', 'info');
      return;
    }

    let gefilterte: Kind[] = [];
    if (aktiveVorlage?.istStatisch && aktiveVorlage.kinderIds) {
      const set = new Set(aktiveVorlage.kinderIds);
      const basePool = allKinder.filter((k) => set.has(k.id));
      gefilterte = kinderFiltern(basePool, filter);
    } else {
      gefilterte = kinderFiltern(allKinder, filter);
    }
    
    if (gefilterte.length === 0) {
      setGefiltertePool([]);
      showToast('Keine Kinder entsprechen den angegebenen Kriterien.', 'error');
      return;
    }

    setGefiltertePool(gefilterte);
    setManuellGewaehltIds([]);
    setPhase('auswahl');
  };

  // Toggle manual selection of a kid in Phase 2
  const handleToggleSelectKid = (id: string) => {
    setManuellGewaehltIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        if (filter.anzahl !== undefined && filter.anzahl > 0 && prev.length >= filter.anzahl) {
          showToast(`Limit von ${filter.anzahl} Kindern erreicht. Wenn du dieses Kind auswählst, wird die Liste beim Erstellen vergrößert.`, 'info');
        }
        return [...prev, id];
      }
    });
  };

  // Finalize selection and generate result list (Phase 3)
  const handleFinalizeList = async () => {
    const logMapFuerVorlage = aktiveVorlage?.id 
      ? (aktivitaetsLogMap.get(aktiveVorlage.id) || new Map<string, string>())
      : undefined;

    const endgueltigeAuswahl = kinderAuswaehlen(
      gefiltertePool,
      filter.anzahl,
      filter.zufallsauswahl,
      logMapFuerVorlage,
      manuellGewaehltIds
    );

    if (endgueltigeAuswahl.length === 0) {
      showToast('Es wurden keine Kinder ausgewählt.', 'error');
      return;
    }

    setGenerierteKinder(endgueltigeAuswahl);

    // Build filter summary text
    let info = '';
    if (aktiveVorlage) {
      info += `Vorlage: "${aktiveVorlage.name}" • `;
    }
    if (filter.gruppen.length > 0) {
      info += `Gruppen: ${filter.gruppen.join(', ')} • `;
    } else {
      info += 'Alle Gruppen • ';
    }
    if (filter.alterVon !== undefined || filter.alterBis !== undefined) {
      info += `Alter: ${filter.alterVon || 0}-${filter.alterBis || 99} J. • `;
    }
    info += `${endgueltigeAuswahl.length} Kinder (${filter.zufallsauswahl ? 'Zufall' : 'Rotations-Fokus'})`;
    setFilterInfoText(info);

    // Update last used timestamp if using a template
    if (aktiveVorlage) {
      try {
        const updated: Listenvorlage = {
          ...aktiveVorlage,
          zuletztVerwendetAm: new Date().toISOString()
        };
        await vorlageSpeichern(updated);
        setAktiveVorlage(updated);
      } catch (err) {
        console.error('Fehler beim Aktualisieren des Vorlagen-Zeitstempels:', err);
      }
    }

    setPhase('ergebnis');
    showToast('Liste erfolgreich generiert!', 'success');
  };

  // Confirm activity execution (Marks kids in activity log)
  const handleConfirmActivity = async () => {
    if (generierteKinder.length === 0) return;

    try {
      const kinderIds = generierteKinder.map((k) => k.id);
      if (aktiveVorlage?.id) {
        await aktivitaetFuerVorlageMarkieren(aktiveVorlage.id, kinderIds);
      } else {
        await aktivitaetenMarkieren(kinderIds);
      }

      showToast(`Aktivität für ${generierteKinder.length} Kinder erfolgreich in der Historie erfasst!`, 'success');

      // Reset flow
      setPhase('filter');
      setGenerierteKinder([]);
      setManuellGewaehltIds([]);
    } catch (error: any) {
      showToast(error.message || 'Fehler beim Erfassen der Aktivität.', 'error');
    }
  };

  // Re-read current member pool if DB changes
  const currentStaticPool = React.useMemo(() => {
    if (aktiveVorlage?.istStatisch && aktiveVorlage.kinderIds) {
      const set = new Set(aktiveVorlage.kinderIds);
      return allKinder.filter((k) => set.has(k.id)).sort((a, b) => a.vorname.localeCompare(b.vorname, 'de'));
    }
    return [];
  }, [aktiveVorlage, allKinder]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header & Navigation */}
      <div className="no-print select-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            📋 Listen-Generator
          </h1>
          <p className="text-slate-500 text-sm md:text-base mt-1">
            {phase === 'statisch_mitglieder' && 'Mitgliederübersicht deiner festen Gruppe. Du kannst Kinder direkt bearbeiten oder eine Aktivität generieren.'}
            {phase === 'filter' && 'Schritt 1 von 3: Wähle Kriterien für deine Aktivität aus.'}
            {phase === 'auswahl' && 'Schritt 2 von 3: Wähle Kinder manuell aus oder lasse die App auffüllen.'}
            {phase === 'ergebnis' && 'Schritt 3 von 3: Deine fertige Liste. Drucke sie aus oder erfasse die Aktivität.'}
          </p>
        </div>

        {/* Save as Template button */}
        {phase === 'filter' && (
          <button
            onClick={() => setIsSaveDialogOpen(true)}
            className="py-3 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl shadow-sm text-sm transition focus:outline-none flex items-center justify-center gap-1.5 self-start md:self-auto"
          >
            💾 Als Vorlage speichern
          </button>
        )}
      </div>

      {/* Template selector strip (Only in filter configuration phase or static view) */}
      {(phase === 'filter' || phase === 'statisch_mitglieder') && (
        <div className="no-print">
          <VorlagenLeiste
            vorlagen={vorlagen}
            aktiveVorlage={aktiveVorlage}
            onSelect={handleSelectVorlage}
            onDeleteRequest={handleDeleteVorlage}
          />
        </div>
      )}

      {/* 4-Phase content container */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* PHASE 0: Direct Static Group Member View */}
        {phase === 'statisch_mitglieder' && aktiveVorlage?.istStatisch && (
          <div className="no-print space-y-6 animate-in fade-in duration-200">
            
            {/* Header Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👥</span>
                  <h2 className="text-2xl font-black text-slate-800">{aktiveVorlage.name}</h2>
                  <span className="bg-purple-100 text-purple-700 font-extrabold text-xs px-3 py-1 rounded-full">
                    Feste Gruppe • {currentStaticPool.length} Kinder
                  </span>
                </div>
                {aktiveVorlage.beschreibung && (
                  <p className="text-sm text-slate-500 mt-1 italic">{aktiveVorlage.beschreibung}</p>
                )}
              </div>

              {/* Action Button to Filter Flow */}
              <button
                onClick={() => setPhase('filter')}
                className="py-3.5 px-6 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-2xl shadow-md transition text-sm flex items-center justify-center gap-2 shrink-0 focus:outline-none"
              >
                ⚡ Aktivität für diese Gruppe generieren (Filtern & Ziehen) &rarr;
              </button>
            </div>

            {/* Members Table Card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden select-none">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <span>Mitglieder dieser Gruppe</span>
                  <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">
                    {currentStaticPool.length}
                  </span>
                </h3>
                <span className="text-xs text-slate-500">
                  💡 Bearbeitungen hier werden sofort mit dem Kinder-Tab & Cloud-Sync abgeglichen.
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/30">
                      <th className="py-3.5 px-4 w-12 text-center">#</th>
                      <th className="py-3.5 px-4">Name</th>
                      <th className="py-3.5 px-4">Gruppe</th>
                      <th className="py-3.5 px-4">Alter</th>
                      <th className="py-3.5 px-4">Besonderheiten</th>
                      <th className="py-3.5 px-4 text-right">Aktion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {currentStaticPool.map((kind, idx) => (
                      <tr key={kind.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 text-center font-bold text-slate-400 text-xs">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {kind.vorname}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-semibold">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                            {kind.gruppe}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {formatierteAltersAngabe(kind.geburtsdatum)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 italic">
                          {kind.besonderheiten || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleEditKindRequest(kind)}
                            className="py-1.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-xl text-xs transition border border-purple-200 focus:outline-none"
                          >
                            ✏️ Bearbeiten
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Action Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPhase('filter')}
                className="py-4 px-8 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-2xl shadow-lg transition text-base flex items-center gap-2 focus:outline-none"
              >
                ⚡ Aktivität für diese Gruppe generieren (Filtern & Ziehen) &rarr;
              </button>
            </div>

          </div>
        )}

        {/* Phase 1: Filter Panel */}
        {phase === 'filter' && (
          <div className="no-print space-y-4">
            {aktiveVorlage?.istStatisch && (
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl flex items-center justify-between gap-3 text-purple-900 select-none">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👥</span>
                  <div>
                    <h3 className="font-bold text-base">Feste Gruppe geladen: {aktiveVorlage.name}</h3>
                    <p className="text-xs text-purple-700">
                      Du filterst innerhalb der {aktiveVorlage.kinderIds?.length || 0} festen Mitglieder dieser Gruppe. Passe unten Alter, Anzahl oder Sortierung an.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPhase('statisch_mitglieder')}
                  className="py-2 px-3 bg-white border border-purple-200 text-purple-700 font-bold rounded-xl text-xs hover:bg-purple-100 transition shrink-0"
                >
                  &larr; Zurück zur Mitgliederansicht
                </button>
              </div>
            )}
            <FilterPanel
              gruppen={gruppen}
              filter={filter}
              setFilter={setFilter}
              onGenerate={handleStartSelection}
              hasResults={false}
            />
          </div>
        )}

        {/* Phase 2: Selection Table */}
        {phase === 'auswahl' && (
          <div className="no-print">
            <KinderAuswahlTabelle
              kinder={gefiltertePool}
              manuellGewaehltIds={manuellGewaehltIds}
              onToggleSelect={handleToggleSelectKid}
              onSelectAll={() => setManuellGewaehltIds(gefiltertePool.map((k) => k.id))}
              onClearSelection={() => setManuellGewaehltIds([])}
              vorlagen={vorlagen}
              aktiveVorlage={aktiveVorlage}
              aktivitaetsLogMap={aktivitaetsLogMap}
              onProceed={handleFinalizeList}
              onBack={() => setPhase('filter')}
              limit={filter.anzahl}
            />
          </div>
        )}

        {/* Phase 3: Result List */}
        {phase === 'ergebnis' && (
          <>
            <div className="no-print">
              <ErgebnisListe
                kinder={generierteKinder}
                filterInfoText={filterInfoText}
                onRefresh={handleConfirmActivity}
              />
            </div>
            
            {/* Go Back button to re-adjust selections in Phase 3 */}
            <div className="no-print flex justify-start">
              <button
                onClick={() => setPhase('auswahl')}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold transition focus:outline-none"
              >
                &larr; Zurück zur Kinderauswahl
              </button>
            </div>
            
            {/* Native print view (rendered during window.print()) */}
            <DruckAnsicht
              kinder={generierteKinder}
              filterInfoText={filterInfoText}
            />
          </>
        )}

      </div>

      {/* Save Template Dialog Modal */}
      <VorlageSpeichernDialog
        isOpen={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        onSave={handleSaveVorlage}
        aktiveVorlage={aktiveVorlage}
      />

      {/* Edit Kid Modal inside static member view */}
      <KindFormular
        isOpen={isEditKindOpen}
        onClose={() => {
          setIsEditKindOpen(false);
          setEditingKind(undefined);
        }}
        kind={editingKind}
        gruppen={gruppen}
        onSave={handleSaveKind}
      />

    </div>
  );
}

export default function ListenPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-slate-500 font-bold">
        Listen-Generator wird geladen...
      </div>
    }>
      <ListenPageContent />
    </Suspense>
  );
}
