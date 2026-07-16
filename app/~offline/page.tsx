'use client';

import React from 'react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAF5] text-slate-800 p-6 text-center">
      <div className="max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <div className="text-6xl mb-4">📴</div>
        <h1 className="text-2xl font-bold text-[#4A90D9] mb-3">Du bist offline</h1>
        <p className="text-slate-600 mb-6">
          Keine Sorge! Da Kita-Listen komplett lokal auf deinem Gerät läuft, kannst du die App und alle Kinderdaten auch ohne Internetverbindung uneingeschränkt nutzen.
        </p>
        <Link 
          href="/" 
          className="inline-block w-full py-3 px-6 text-center text-white bg-[#4A90D9] hover:bg-[#357ABD] active:bg-[#2A629A] rounded-xl font-semibold transition shadow-sm text-lg"
        >
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}
