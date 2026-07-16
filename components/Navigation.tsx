'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DatenSicherung from './DatenSicherung';

export default function Navigation() {
  const pathname = usePathname();
  const [isBackupOpen, setIsBackupOpen] = useState(false);

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
            </button>
          </nav>

        </div>
      </header>

      {/* Backup Modal */}
      <DatenSicherung isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />
    </>
  );
}
