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
  letzteAktivitaetProKindFuerVorlage,
  letzteAktivitaetProKindFuerAlleVorlagen,
  aktivitaetFuerVorlageMarkieren,
  aktivitaetenMarkieren
} from '@/lib/db-operations';
import { kinderFiltern, kinderAuswaehlen } from '@/lib/listengenerator';
import { useToast } from '@/components/Toast';

import FilterPanel from './components/FilterPanel';
import ErgebnisListe from './components/ErgebnisListe';
import DruckAnsicht from './components/DruckAnsicht';
import VorlagenLeiste from './components/VorlagenLeiste';
import VorlageSpeichernDialog from './components/VorlageSpeichernDialog';
import KinderAuswahlTabelle from './components/KinderAuswahlTabelle';

type Phase = 'filter' | 'auswahl' | 'ergebnis';

function ListenPageContent() {
  const { showToast } = useToast();

  // 1. Live Queries from DB
  const allKinder = useLiveQuery(() => db.kinder.toArray()) || [];
  const gruppen = useLiveQuery(() => gruppenLaden()) || [];
  const vorlagen = useLiveQuery(() => db.vorlagen.toArray()) || [];
  
  // Live map of activity logs: templateId -> Map<kindId, dateStr>
  const aktivitaetsLogMap = useLiveQuery(async () => {
    return await letzteAktivitaetProKindFuerAlleVorlagen();
  }) || new Map<string, Map<string, string>>();

  // 2. State Management
  const [phase, setPhase] = useState<Phase>('filter');
  const [aktiveVorlage, setAktiveVorlage] = useState<Listenvorlage | null>(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

  // URL param loader state
  const searchParams = useSearchParams();
  const paramVorlagenId = searchParams.get('vorlagenId');
  const [loadedFromParam, setLoadedFromParam] = useState(false);

  useEffect(() => {
    if (paramVorlagenId && vorlagen.length > 0 && allKinder.length > 0 && !loadedFromParam) {
      const found = vorlagen.find((v) => v.id === paramVorlagenId);
      if (found) {
        setAktiveVorlage(found);
        setFilter(found.filterOptionen);
        
        const pool = kinderFiltern(allKinder, found.filterOptionen);
        setGefiltertePool(pool);
        setPhase('auswahl'); // Jump directly to Phase 2 (Manual selection)
        
        setLoadedFromParam(true);
        showToast(`Vorlage '${found.name}' geladen.`, 'success');
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
    setPhase('filter');
    setGenerierteKinder([]);
    setManuellGewaehltIds([]);
    
    if (v) {
      // Prefill filter state from template
      setFilter(v.filterOptionen);
      showToast(`Vorlage '${v.name}' geladen.`, 'success');
    } else {
      // Reset filter state to default
      setFilter({
        alterVon: undefined,
        alterBis: undefined,
        gruppen: [],
        anzahl: 6,
        zufallsauswahl: true
      });
    }
  };

  // 4. Save template handler
  const handleSaveVorlage = async (name: string, updateExisting: boolean, beschreibung?: string) => {
    try {
      if (updateExisting && aktiveVorlage) {
        // Save updates on existing template
        const updated: Listenvorlage = {
          ...aktiveVorlage,
          filterOptionen: filter,
          zuletztVerwendetAm: aktiveVorlage.zuletztVerwendetAm
        };
        await vorlageSpeichern(updated);
        setAktiveVorlage(updated);
        showToast(`Vorlage '${updated.name}' aktualisiert.`, 'success');
      } else {
        // Create new template record
        const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        const neu: Listenvorlage = {
          id: uuid,
          name,
          beschreibung,
          filterOptionen: filter,
          erstelltAm: new Date().toISOString()
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

  // 5. Delete template handler
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

  // 6. Action: Generate filter pool and go to Phase 2 (Selection Table)
  const handleStartSelection = () => {
    if (allKinder.length === 0) {
      showToast('Es sind noch keine Kinder in der Datenbank eingetragen.', 'info');
      return;
    }

    const gefilterte = kinderFiltern(allKinder, filter);
    
    if (gefilterte.length === 0) {
      setGefiltertePool([]);
      showToast('Keine Kinder entsprechen den angegebenen Kriterien.', 'error');
      return;
    }

    setGefiltertePool(gefilterte);
    setManuellGewaehltIds([]);
    setPhase('auswahl'); // Go to selection phase
  };

  // 7. Toggle manual selection of a kid in Phase 2
  const handleToggleSelectKid = (id: string) => {
    setManuellGewaehltIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        // Prevent selecting more than target limit if limit is configured
        if (filter.anzahl !== undefined && filter.anzahl > 0 && prev.length >= filter.anzahl) {
          showToast(`Limit von ${filter.anzahl} Kindern erreicht. Wenn du dieses Kind auswählst, wird die Liste beim Erstellen vergrößert.`, 'info');
        }
        return [...prev, id];
      }
    });
  };

  // 8. Phase 2 Completion: Apply selection and fill the rest per rotation
  const handleProceedToResult = async (onlyManual: boolean) => {
    const freshKids = await db.kinder.toArray();
    const activeFilterPool = kinderFiltern(freshKids, filter);

    let finalSelection: Kind[] = [];
    
    // Read activity logs specific to the active template
    const templateLogMap = aktiveVorlage 
      ? await letzteAktivitaetProKindFuerVorlage(aktiveVorlage.id) 
      : undefined;

    if (onlyManual) {
      // Use exactly the manually clicked items
      finalSelection = activeFilterPool.filter((k) => manuellGewaehltIds.includes(k.id));
    } else {
      // Standard selection: Pinned kids + rest filled by rotation/random
      finalSelection = kinderAuswaehlen(
        activeFilterPool,
        filter.anzahl,
        filter.zufallsauswahl,
        templateLogMap,
        manuellGewaehltIds
      );
    }

    // Generate readable filter information summary text
    const filterTeile: string[] = [];
    
    if (aktiveVorlage) {
      filterTeile.push(`Vorlage: ${aktiveVorlage.name}`);
    } else {
      filterTeile.push('Einmal-Liste');
    }

    if (filter.gruppen.length > 0) {
      filterTeile.push(`Gruppen: ${filter.gruppen.join(', ')}`);
    }

    if (manuellGewaehltIds.length > 0) {
      filterTeile.push(`${manuellGewaehltIds.length} gesetzt`);
    }
    
    if (!onlyManual && filter.anzahl && finalSelection.length > manuellGewaehltIds.length) {
      const rest = finalSelection.length - manuellGewaehltIds.length;
      filterTeile.push(`${rest} per ${filter.zufallsauswahl ? 'Rotation' : 'Zufall'} aufgefüllt`);
    }

    setGenerierteKinder(finalSelection);
    setFilterInfoText(filterTeile.join(' | '));
    setPhase('ergebnis'); // Show results
    showToast(`Liste mit ${finalSelection.length} Kindern erstellt.`, 'success');
  };

  // 9. Mark participation in Phase 3
  const handleRefresh = async () => {
    // If a template is loaded, we write template specific log.
    // Otherwise, we write global activity date.
    const ids = generierteKinder.map((k) => k.id);
    
    try {
      if (aktiveVorlage) {
        await aktivitaetFuerVorlageMarkieren(aktiveVorlage.id, ids);
        showToast(`Aktivität für '${aktiveVorlage.name}' eingetragen!`, 'success');
      } else {
        await aktivitaetenMarkieren(ids);
        showToast('Globale Aktivitäten eingetragen!', 'success');
      }
      
      // Reload current selection with updated database state
      const freshKids = await db.kinder.toArray();
      const updatedSelection = generierteKinder.map((gk) => {
        const found = freshKids.find((fk) => fk.id === gk.id);
        return found ? found : gk;
      });
      setGenerierteKinder(updatedSelection);
    } catch (e: any) {
      showToast(e.message || 'Fehler beim Markieren.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="no-print select-none flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            📋 Listengenerator
          </h1>
          <p className="text-slate-500 text-sm md:text-base mt-1">
            Erstelle schnelle Aktivitäten- und Gruppenlisten mit Rotationslogik und manueller Auswahl.
          </p>
        </div>
        
        {phase === 'filter' && (
          <button
            onClick={() => setIsSaveDialogOpen(true)}
            className="py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition text-sm flex items-center gap-1.5 focus:outline-none"
            title="Aktuelle Filtereinstellungen speichern"
          >
            💾 Als Vorlage speichern
          </button>
        )}
      </div>

      {/* Template selector strip (Only in filter configuration phase) */}
      {phase === 'filter' && (
        <div className="no-print">
          <VorlagenLeiste
            vorlagen={vorlagen}
            aktiveVorlage={aktiveVorlage}
            onSelect={handleSelectVorlage}
            onDeleteRequest={handleDeleteVorlage}
          />
        </div>
      )}

      {/* 3-Phase content container */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Phase 1: Filter Panel */}
        {phase === 'filter' && (
          <div className="no-print">
            <FilterPanel
              gruppen={gruppen}
              filter={filter}
              setFilter={setFilter}
              onGenerate={handleStartSelection}
              hasResults={false} // Selection is step 2 now
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
              onProceed={handleProceedToResult}
              onBack={() => setPhase('filter')}
              limit={filter.anzahl}
            />
          </div>
        )}

        {/* Phase 3: Results (Table and PDF/Print controls) */}
        {phase === 'ergebnis' && (
          <>
            <ErgebnisListe
              kinder={generierteKinder}
              filterInfoText={filterInfoText}
              onRefresh={handleRefresh}
            />
            
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

    </div>
  );
}

export default function ListenPage() {
  return (
    <Suspense fallback={<div className="text-center p-12 text-slate-400 select-none">Lade Listengenerator...</div>}>
      <ListenPageContent />
    </Suspense>
  );
}
