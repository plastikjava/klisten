import Dexie, { type Table } from 'dexie';
import { Kind, Listenvorlage, AktivitaetsLog, AnwesenheitsEintrag } from '@/types';

export class KitaListenDB extends Dexie {
  kinder!: Table<Kind, string>;
  vorlagen!: Table<Listenvorlage, string>;
  aktivitaetsLog!: Table<AktivitaetsLog, string>;
  anwesenheit!: Table<AnwesenheitsEintrag, string>;

  constructor() {
    super('KitaListenDB');
    
    // Version 1 (Initial Setup)
    this.version(1).stores({
      kinder: 'id, vorname, geburtsdatum, gruppe, letzteAktivitaetAm'
    });

    // Version 2 (Template support & custom rotation log)
    this.version(2).stores({
      kinder: 'id, vorname, geburtsdatum, gruppe, letzteAktivitaetAm',
      vorlagen: 'id, name, erstelltAm, zuletztVerwendetAm',
      aktivitaetsLog: 'id, vorlagenId, kindId, datum, [vorlagenId+kindId]'
    });

    // Version 3 (Attendance tracking table)
    this.version(3).stores({
      kinder: 'id, vorname, geburtsdatum, gruppe, letzteAktivitaetAm',
      vorlagen: 'id, name, erstelltAm, zuletztVerwendetAm',
      aktivitaetsLog: 'id, vorlagenId, kindId, datum, [vorlagenId+kindId]',
      anwesenheit: 'id, kindId, datum, status, [datum+kindId]'
    });
  }
}

// Singleton database instance
export const db = new KitaListenDB();
