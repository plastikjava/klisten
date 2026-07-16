import type { MetadataRoute } from 'next';

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kita-Listen',
    short_name: 'KitaListen',
    description: 'Lokale Verwaltung von Kinderdaten und Listengenerator für Kitas',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAFAF5',
    theme_color: '#4A90D9',
    orientation: 'any',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
