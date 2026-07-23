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
    const base = "px-3 py-2 md:px-4 md:py-2.5 rounded-xl font-bold transition text-sm md:text-base lg:text-lg flex items-center gap-1.5 focus:outline-none";
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
          <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-100 border border-emerald-400/30 px-2 py-1 rounded-lg font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="hidden lg:inline">Cloud-Sync aktiv</span>
          </span>
        );
      case 'syncing':
        return (
          <span className="inline-flex items-center gap-1 text-xs bg-amber-500/20 text-amber-100 border border-amber-400/30 px-2 py-1 rounded-lg font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping"></span>
            <span className="hidden lg:inline">Cloud-Sync prüft...</span>
          </span>
        );
      case 'kv_missing':
        return (
          <span className="inline-flex items-center gap-1 text-xs bg-rose-500/20 text-rose-100 border border-rose-400/30 px-2 py-1 rounded-lg font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            <span className="hidden lg:inline">Sync-DB verbinden</span>
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 text-xs bg-rose-500/20 text-rose-100 border border-rose-400/30 px-2 py-1 rounded-lg font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            <span className="hidden lg:inline">Sync Fehler</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <header className="bg-[#4A90D9] text-white py-4 px-4 md:px-8 shadow-md no-print sticky top-0 z-40 select-none">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo / Title */}
          <Link href="/" className="flex items-center gap-2 text-2xl font-black tracking-tight hover:opacity-95 transition">
            <span className="text-3xl" role="img" aria-label="Children logo">🧒</span>
            <span>Kita-Listen</span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex flex-wrap items-center justify-center gap-1.5">
            <Link href="/kinder" className={navLinkClass('/kinder')}>
              🧒 <span className="hidden sm:inline">Kinder</span>
            </Link>
            <Link href="/vorlagen" className={navLinkClass('/vorlagen')}>
              📚 <span className="hidden sm:inline">Vorlagen</span>
            </Link>
            <Link href="/listen" className={navLinkClass('/listen')}>
              📋 <span className="hidden sm:inline">Liste erstellen</span><span className="sm:hidden">Listen</span>
            </Link>
            <button
              onClick={() => setIsBackupOpen(true)}
              className="px-3 py-2 md:px-4 md:py-2.5 rounded-xl font-bold transition text-sm md:text-base lg:text-lg text-white/90 hover:text-white hover:bg-white/10 flex items-center gap-1.5 focus:outline-none"
            >
              💾 <span className="hidden sm:inline">Datensicherung</span><span className="sm:hidden">Backup</span>
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
