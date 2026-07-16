'use client';

import React from 'react';

interface LoeschenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  kindName: string;
}

export default function LoeschenDialog({ isOpen, onClose, onConfirm, kindName }: LoeschenDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-xl border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-rose-50 border-b border-rose-100 p-5 text-rose-800 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <h2 className="text-lg font-bold">Eintrag löschen?</h2>
        </div>

        {/* Body */}
        <div className="p-6 space-y-3">
          <p className="text-slate-600 text-sm md:text-base leading-relaxed">
            Möchtest du das Kind <strong>{kindName}</strong> wirklich aus der Datenbank entfernen?
          </p>
          <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition text-sm focus:outline-none"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm transition text-sm focus:outline-none"
          >
            Ja, löschen
          </button>
        </div>

      </div>
    </div>
  );
}
