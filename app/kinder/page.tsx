'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Kind } from '@/types';
import { kindHinzufuegen, kindAktualisieren, kindLoeschen, gruppenLaden } from '@/lib/db-operations';
import { useToast } from '@/components/Toast';
import { berechneAlter } from '@/lib/alter';

import KinderListe from './components/KinderListe';
import KindFormular from './components/KindFormular';
import LoeschenDialog from './components/LoeschenDialog';

type SortKey = 'name' | 'gruppe' | 'alter';

export default function KinderPage() {
  const { showToast } = useToast();
  
  // State for search and sort
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortReverse, setSortReverse] = useState(false);

  // Modal control states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedKind, setSelectedKind] = useState<Kind | undefined>(undefined);

  // Live Query from IndexedDB
  const kinder = useLiveQuery(() => db.kinder.toArray()) || [];
  
  // Get active groups dynamically for the form dropdown
  const gruppen = useLiveQuery(() => gruppenLaden()) || [];

  const handleOpenAddForm = () => {
    setSelectedKind(undefined);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (kind: Kind) => {
    setSelectedKind(kind);
    setIsFormOpen(true);
  };

  const handleOpenDeleteDialog = (kind: Kind) => {
    setSelectedKind(kind);
    setIsDeleteOpen(true);
  };

  const handleSaveKind = async (kindData: Omit<Kind, 'id' | 'geaendertAm'>) => {
    try {
      if (selectedKind) {
        // Edit mode
        await kindAktualisieren(selectedKind.id, kindData);
        showToast(`${kindData.vorname} erfolgreich aktualisiert!`, 'success');
      } else {
        // Add mode
        await kindHinzufuegen(kindData);
        showToast(`${kindData.vorname} erfolgreich hinzugefügt!`, 'success');
      }
      setIsFormOpen(false);
    } catch (error: any) {
      showToast(error.message || 'Operation fehlgeschlagen.', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedKind) return;
    try {
      await kindLoeschen(selectedKind.id);
      showToast(`${selectedKind.vorname} wurde gelöscht.`, 'success');
      setIsDeleteOpen(false);
      setSelectedKind(undefined);
    } catch (error: any) {
      showToast(error.message || 'Löschen fehlgeschlagen.', 'error');
    }
  };

  // Sort and filter kid records on the client side
  const gefilterteUndSortierteKinder = kinder
    .filter((kind) => 
      kind.vorname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kind.gruppe.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'name') {
        comparison = a.vorname.localeCompare(b.vorname, 'de');
      } else if (sortBy === 'gruppe') {
        comparison = a.gruppe.localeCompare(b.gruppe, 'de');
        if (comparison === 0) {
          comparison = a.vorname.localeCompare(b.vorname, 'de');
        }
      } else if (sortBy === 'alter') {
        // Compare age (geburtsdatum string sorting is equivalent to comparing birth dates).
        // To sort "Older first", birth date should be smaller (earlier date).
        // Hence, we compare a.geburtsdatum vs b.geburtsdatum.
        comparison = a.geburtsdatum.localeCompare(b.geburtsdatum);
        if (comparison === 0) {
          comparison = a.vorname.localeCompare(b.vorname, 'de');
        }
      }
      
      return sortReverse ? -comparison : comparison;
    });

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortReverse(!sortReverse);
    } else {
      setSortBy(key);
      setSortReverse(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            🧒 Kinderverwaltung
          </h1>
          <p className="text-slate-500 text-sm md:text-base mt-1">
            Füge Kinder hinzu, bearbeite Profile oder lösche Einträge. ({gefilterteUndSortierteKinder.length} Einträge)
          </p>
        </div>
        <button
          onClick={handleOpenAddForm}
          className="py-3.5 px-6 bg-[#4A90D9] hover:bg-[#357ABD] text-white font-extrabold rounded-2xl shadow-sm text-base md:text-lg transition focus:outline-none flex items-center justify-center gap-2 shrink-0 self-stretch md:self-auto"
        >
          <span>➕</span> Kind hinzufügen
        </button>
      </div>

      {/* Search and Sort Toolbar */}
      <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 select-none">
        
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="Nach Name oder Gruppe suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/50 transition"
          />
        </div>

        {/* Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-slate-500 mr-1 hidden sm:inline">Sortieren nach:</span>
          
          <button
            onClick={() => toggleSort('name')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition focus:outline-none border ${
              sortBy === 'name' 
                ? 'bg-sky-50 border-sky-200 text-[#4A90D9]' 
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Name {sortBy === 'name' && (sortReverse ? '▲' : '▼')}
          </button>
          
          <button
            onClick={() => toggleSort('gruppe')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition focus:outline-none border ${
              sortBy === 'gruppe' 
                ? 'bg-sky-50 border-sky-200 text-[#4A90D9]' 
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Gruppe {sortBy === 'gruppe' && (sortReverse ? '▲' : '▼')}
          </button>
          
          <button
            onClick={() => toggleSort('alter')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition focus:outline-none border ${
              sortBy === 'alter' 
                ? 'bg-sky-50 border-sky-200 text-[#4A90D9]' 
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Alter {sortBy === 'alter' && (sortReverse ? '▲' : '▼')}
          </button>
        </div>

      </div>

      {/* Main List */}
      <KinderListe
        kinder={gefilterteUndSortierteKinder}
        onEdit={handleOpenEditForm}
        onDeleteRequest={handleOpenDeleteDialog}
      />

      {/* Form Dialog (Modal) */}
      <KindFormular
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveKind}
        kind={selectedKind}
        gruppen={gruppen}
      />

      {/* Delete Dialog (Modal) */}
      <LoeschenDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        kindName={selectedKind?.vorname || ''}
      />

    </div>
  );
}
