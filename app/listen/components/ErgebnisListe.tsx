'use client';

import React, { useState } from 'react';
import { Kind } from '@/types';
import { formatierteAltersAngabe } from '@/lib/alter';
import { aktivitaetenMarkieren } from '@/lib/db-operations';
import { listeAlsPdfExportieren } from '@/lib/pdf-export';
import { useToast } from '@/components/Toast';

interface ErgebnisListeProps {
  kinder: Kind[];
  filterInfoText: string;
  onRefresh: () => void;
}

export default function ErgebnisListe({ kinder, filterInfoText, onRefresh }: ErgebnisListeProps) {
  const { showToast } = useToast();
  const [isMarking, setIsMarking] = useState(false);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleMarkAsActivity = async () => {
    if (kinder.length === 0) return;
    setIsMarking(true);
    try {
      const ids = kinder.map((k) => k.id);
      await aktivitaetenMarkieren(ids);
      showToast('Aktivität erfolgreich für alle ausgewählten Kinder markiert!', 'success');
      onRefresh(); // Refresh parent view to pull latest dates
    } catch (error: any) {
      showToast(error.message || 'Aktivität konnte nicht markiert werden.', 'error');
    } finally {
      setIsMarking(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    try {
      await listeAlsPdfExportieren(kinder, filterInfoText);
      showToast('PDF-Export erfolgreich gestartet!', 'success');
    } catch (error) {
      showToast('Fehler beim PDF-Export.', 'error');
    }
  };

  if (kinder.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6 no-print animate-in fade-in duration-300 select-none">
      
      {/* Header toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            📊 Generierte Liste ({kinder.length} Kinder)
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-md truncate" title={filterInfoText}>
            Kriterien: {filterInfoText}
          </p>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-sm flex items-center gap-1.5 focus:outline-none"
            title="Druckvorschau öffnen"
          >
            🖨️ Drucken
          </button>
          
          <button
            onClick={handleExportPDF}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-sm flex items-center gap-1.5 focus:outline-none"
            title="PDF herunterladen"
          >
            📄 PDF-Export
          </button>
          
          <button
            onClick={handleMarkAsActivity}
            disabled={isMarking}
            className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition text-sm flex items-center gap-1.5 disabled:opacity-50 focus:outline-none"
            title="Setzt die letzte Aktivität aller aufgelisteten Kinder auf das heutige Datum"
          >
            🏁 Als Aktivität markieren
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase">
              <th className="p-3 pl-4">Nr.</th>
              <th className="p-3">Name</th>
              <th className="p-3">Gruppe</th>
              <th className="p-3">Alter</th>
              <th className="p-3 pr-4">Letzte Aktivität</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {kinder.map((kind, idx) => (
              <tr key={kind.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-3 pl-4 text-sm font-semibold text-slate-400">{idx + 1}</td>
                <td className="p-3 font-bold text-slate-800 text-base">{kind.vorname}</td>
                <td className="p-3 text-sm">
                  <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold">
                    {kind.gruppe}
                  </span>
                </td>
                <td className="p-3 text-sm font-semibold">
                  {formatierteAltersAngabe(kind.geburtsdatum)}
                </td>
                <td className="p-3 text-sm text-slate-500 pr-4">
                  {formatDate(kind.letzteAktivitaetAm)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
