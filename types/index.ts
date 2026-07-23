export interface Kind {
  id: string; // UUID
  vorname: string;
  geburtsdatum: string; // ISO-Datum YYYY-MM-DD
  gruppe: string;
  letzteAktivitaetAm?: string; // ISO-Datum YYYY-MM-DD, für Rotationslogik
  besonderheiten?: string; // optionales Freitextfeld (z.B. Allergien)
  geaendertAm: string; // ISO-Datum der letzten Änderung, für P2P-Sync
  geloescht?: boolean; // Soft Delete Marker (Tombstone für P2P-Sync)
}

export interface FilterOptionen {
  alterVon?: number; // Mindestalter in Jahren (z.B. 3)
  alterBis?: number; // Höchstalter in Jahren (z.B. 5)
  gruppen: string[]; // Ausgewählte Gruppen (Mehrfachauswahl)
  anzahl?: number; // Begrenzung auf n Kinder
  zufallsauswahl: boolean; // Ob zufällig ausgewählt werden soll
}

export interface Listenvorlage {
  id: string; // UUID
  name: string; // z.B. "Vorlese-Oma"
  beschreibung?: string; // optionale Beschreibung
  filterOptionen?: FilterOptionen; // gespeicherte Filtereinstellungen, optional für statische Listen
  istStatisch: boolean; // true = Feste Gruppenliste, false = Filter-Vorlage
  kinderIds?: string[]; // IDs der Kinder in der statischen Liste
  erstelltAm: string; // ISO-Datum YYYY-MM-DDTHH:mm:ss.sssZ
  zuletztVerwendetAm?: string; // ISO-Datum YYYY-MM-DD
  geaendertAm: string; // ISO-Datum der letzten Änderung, für P2P-Sync
  geloescht?: boolean; // Soft Delete Marker (Tombstone für P2P-Sync)
}

export interface AktivitaetsLog {
  id: string; // UUID
  vorlagenId: string; // ID der Listenvorlage
  kindId: string; // ID des Kindes
  datum: string; // ISO-Datum YYYY-MM-DD, wann die Aktivität stattfand
  geaendertAm: string; // ISO-Datum der letzten Änderung, für P2P-Sync
}
