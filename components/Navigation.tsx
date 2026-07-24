'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DatenSicherung from './DatenSicherung';
import { useSync } from './SyncProvider';

export default function Navigation() {
  const pathname = usePathname();
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const { status, roomName } = useSync();

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  const navLinkClass = (path: string) => {
    const base = "px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl font-bold transition text-xs md:text-sm flex items-center gap-1 focus:outline-none shrink-0";
    if (isActive(path)) {
      return `${base} bg-white text-[#4A90D9] shadow-sm`;
    }
    return `${base} text-white/90 hover:text-white hover:bg-white/10`;
  };

  const getSyncBadge = () => {
    if (!roomName) return null;
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-100 border border-emerald-400/30 px-1.5 py-0.5 rounded-md font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="hidden xl:inline">Sync aktiv</span>
          </span>
        );
      case 'syncing':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-100 border border-amber-400/30 px-1.5 py-0.5 rounded-md font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping"></span>
            <span className="hidden xl:inline">Sync...</span>
          </span>
        );
      case 'kv_missing':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-rose-500/20 text-rose-100 border border-rose-400/30 px-1.5 py-0.5 rounded-md font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span className="hidden xl:inline">Sync-DB?</span>
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-rose-500/20 text-rose-100 border border-rose-400/30 px-1.5 py-0.5 rounded-md font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span className="hidden xl:inline">Sync Fehler</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <header className="bg-[#4A90D9] text-white py-3 px-3 md:px-6 shadow-md no-print sticky top-0 z-40 select-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Logo / Title */}
          <Link href="/" className="flex items-center gap-2 text-xl md:text-2xl font-black tracking-tight hover:opacity-95 transition shrink-0">
            <span className="text-2xl md:text-3xl" role="img" aria-label="Children logo">🧒</span>
            <span>Kita-Listen</span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex flex-wrap items-center justify-center gap-1 overflow-x-auto max-w-full">
            <Link href="/kinder" className={navLinkClass('/kinder')}>
              🧒 <span>Kinder</span>
            </Link>
            <Link href="/anwesenheit" className={navLinkClass('/anwesenheit')}>
              📋 <span>Anwesenheit</span>
            </Link>
            <Link href="/vorlagen" className={navLinkClass('/vorlagen')}>
              📚 <span>Vorlagen</span>
            </Link>
            <Link href="/listen" className={navLinkClass('/listen')}>
              ⚡ <span>Listen</span>
            </Link>
            <Link href="/geburtstage" className={navLinkClass('/geburtstage')}>
              🎂 <span>Geburtstage</span>
            </Link>
            <Link href="/statistiken" className={navLinkClass('/statistiken')}>
              📊 <span>Statistiken</span>
            </Link>
            <Link href="/infozettel" className={navLinkClass('/infozettel')}>
              ✉️ <span>Info-Zettel</span>
            </Link>

            <button
              onClick={() => setIsBackupOpen(true)}
              className="px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl font-bold transition text-xs md:text-sm text-white/90 hover:text-white hover:bg-white/10 flex items-center gap-1 focus:outline-none shrink-0"
            >
              💾 <span>Backup</span>
              {getSyncBadge()}
            </button>
          </nav>

        </div>
      </header>

      {/* Backup Modal */}
      <DatenSicherung isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />
    </>
  );
}
