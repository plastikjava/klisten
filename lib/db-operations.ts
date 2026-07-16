import { db } from './db';
import { Kind, Listenvorlage, AktivitaetsLog } from '@/types';

/**
 * Loads all kids from the local IndexedDB.
 */
export async function alleKinderLaden(): Promise<Kind[]> {
  try {
    return await db.kinder.toArray();
  } catch (error) {
    console.error('Fehler beim Laden der Kinder:', error);
    throw new Error('Die Kinderdaten konnten nicht aus der lokalen Datenbank geladen werden.');
  }
}

/**
 * Adds a new child to the IndexedDB.
 * Generates a UUID for the id.
 */
export async function kindHinzufuegen(kind: Omit<Kind, 'id' | 'geaendertAm'>): Promise<string> {
  try {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const neuesKind: Kind = {
      ...kind,
      id,
      geaendertAm: new Date().toISOString()
    };
    
    await db.kinder.add(neuesKind);
    return id;
  } catch (error) {
    console.error('Fehler beim Hinzufügen des Kindes:', error);
    throw new Error('Das Kind konnte nicht gespeichert werden. Eventuell ist der Speicher voll.');
  }
}

/**
 * Updates an existing child in the IndexedDB.
 */
export async function kindAktualisieren(id: string, daten: Partial<Kind>): Promise<void> {
  try {
    await db.kinder.update(id, {
      ...daten,
      geaendertAm: new Date().toISOString()
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Kindes:', error);
    throw new Error('Die Änderungen konnten nicht in der Datenbank gespeichert werden.');
  }
}

/**
 * Deletes a child from the IndexedDB by id.
 */
export async function kindLoeschen(id: string): Promise<void> {
  try {
    await db.kinder.delete(id);
  } catch (error) {
    console.error('Fehler beim Löschen des Kindes:', error);
    throw new Error('Das Kind konnte nicht gelöscht werden.');
  }
}

/**
 * Loads all distinct group names currently used.
 */
export async function gruppenLaden(): Promise<string[]> {
  try {
    const kinder = await db.kinder.toArray();
    const gruppenSet = new Set(kinder.map(k => k.gruppe).filter(g => g && g.trim() !== ''));
    return Array.from(gruppenSet).sort();
  } catch (error) {
    console.error('Fehler beim Laden der Gruppen:', error);
    return [];
  }
}

/**
 * Marks a list of children as having participated in a generic activity today.
 * Sets `letzteAktivitaetAm` to the current local date (YYYY-MM-DD).
 */
export async function aktivitaetenMarkieren(ids: string[]): Promise<void> {
  try {
    const heute = new Date().toISOString().split('T')[0];
    const jetzt = new Date().toISOString();
    await db.transaction('rw', db.kinder, async () => {
      for (const id of ids) {
        await db.kinder.update(id, { 
          letzteAktivitaetAm: heute,
          geaendertAm: jetzt
        });
      }
    });
  } catch (error) {
    console.error('Fehler beim Markieren der Aktivität:', error);
    throw new Error('Die Aktivität konnte nicht für alle Kinder markiert werden.');
  }
}

/**
 * Loads all saved templates.
 */
export async function alleVorlagenLaden(): Promise<Listenvorlage[]> {
  try {
    return await db.vorlagen.toArray();
  } catch (error) {
    console.error('Fehler beim Laden der Vorlagen:', error);
    throw new Error('Die Listenvorlagen konnten nicht geladen werden.');
  }
}

/**
 * Saves or updates a template in the database.
 */
export async function vorlageSpeichern(vorlage: Listenvorlage): Promise<void> {
  try {
    await db.vorlagen.put({
      ...vorlage,
      geaendertAm: new Date().toISOString()
    });
  } catch (error) {
    console.error('Fehler beim Speichern der Vorlage:', error);
    throw new Error('Die Vorlage konnte nicht gespeichert werden.');
  }
}

/**
 * Deletes a template and all associated activity logs.
 */
export async function vorlageLoeschen(id: string): Promise<void> {
  try {
    await db.transaction('rw', [db.vorlagen, db.aktivitaetsLog], async () => {
      await db.vorlagen.delete(id);
      await db.aktivitaetsLog.where('vorlagenId').equals(id).delete();
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Vorlage:', error);
    throw new Error('Die Vorlage und ihre Historie konnten nicht gelöscht werden.');
  }
}

/**
 * Marks a list of children as having participated in a template-specific activity today.
 * Inserts records into the `aktivitaetsLog` table and updates `zuletztVerwendetAm` in the template.
 */
export async function aktivitaetFuerVorlageMarkieren(vorlagenId: string, kindIds: string[]): Promise<void> {
  try {
    const heute = new Date().toISOString().split('T')[0];
    const jetzt = new Date().toISOString();
    await db.transaction('rw', [db.aktivitaetsLog, db.vorlagen], async () => {
      // 1. Add log records
      for (const kindId of kindIds) {
        const logId = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        const log: AktivitaetsLog = {
          id: logId,
          vorlagenId,
          kindId,
          datum: heute,
          geaendertAm: jetzt
        };
        await db.aktivitaetsLog.add(log);
      }
      
      // 2. Update last used date on the template
      await db.vorlagen.update(vorlagenId, { 
        zuletztVerwendetAm: heute,
        geaendertAm: jetzt
      });
    });
  } catch (error) {
    console.error('Fehler beim Markieren der Aktivität für die Vorlage:', error);
    throw new Error('Die Aktivität konnte für diese Vorlage nicht markiert werden.');
  }
}

/**
 * Loads the last participation date for each child under a specific template.
 * Returns a Map of kindId -> date string (YYYY-MM-DD).
 */
export async function letzteAktivitaetProKindFuerVorlage(vorlagenId: string): Promise<Map<string, string>> {
  try {
    const logs = await db.aktivitaetsLog.where('vorlagenId').equals(vorlagenId).toArray();
    const map = new Map<string, string>();
    for (const log of logs) {
      const current = map.get(log.kindId);
      if (!current || log.datum > current) {
        map.set(log.kindId, log.datum);
      }
    }
    return map;
  } catch (error) {
    console.error('Fehler beim Laden der Vorlagenhistorie:', error);
    return new Map();
  }
}

/**
 * Loads the last participation date for each child across all templates.
 * Returns a Map where key is templateId, and value is a Map of kindId -> date string (YYYY-MM-DD).
 */
export async function letzteAktivitaetProKindFuerAlleVorlagen(): Promise<Map<string, Map<string, string>>> {
  try {
    const logs = await db.aktivitaetsLog.toArray();
    const resultMap = new Map<string, Map<string, string>>();
    for (const log of logs) {
      if (!resultMap.has(log.vorlagenId)) {
        resultMap.set(log.vorlagenId, new Map<string, string>());
      }
      const childMap = resultMap.get(log.vorlagenId)!;
      const current = childMap.get(log.kindId);
      if (!current || log.datum > current) {
        childMap.set(log.kindId, log.datum);
      }
    }
    return resultMap;
  } catch (error) {
    console.error('Fehler beim Laden der Historie aller Vorlagen:', error);
    return new Map();
  }
}

/**
 * Intelligently merges datasets from another device (P2P synchronization).
 * Compares change timestamps to resolve updates. Keeps newer items.
 */
export async function datenZusammenfuehren(
  importKinder: Kind[],
  importVorlagen: Listenvorlage[],
  importLogs: AktivitaetsLog[]
): Promise<void> {
  try {
    await db.transaction('rw', [db.kinder, db.vorlagen, db.aktivitaetsLog], async () => {
      // 1. Merge Kinder
      const localKinder = await db.kinder.toArray();
      const localKinderMap = new Map(localKinder.map(k => [k.id, k]));
      
      for (const impKind of importKinder) {
        const local = localKinderMap.get(impKind.id);
        if (!local) {
          await db.kinder.add(impKind);
        } else if (impKind.geaendertAm > local.geaendertAm) {
          await db.kinder.put(impKind);
        }
      }

      // 2. Merge Vorlagen
      const localVorlagen = await db.vorlagen.toArray();
      const localVorlagenMap = new Map(localVorlagen.map(v => [v.id, v]));

      for (const impVorlage of importVorlagen) {
        const local = localVorlagenMap.get(impVorlage.id);
        if (!local) {
          await db.vorlagen.add(impVorlage);
        } else if (impVorlage.geaendertAm > local.geaendertAm) {
          await db.vorlagen.put(impVorlage);
        }
      }

      // 3. Merge Logs (logs are unique and additive)
      const localLogs = await db.aktivitaetsLog.toArray();
      const localLogsKeys = new Set(localLogs.map(l => l.id));

      for (const impLog of importLogs) {
        if (!localLogsKeys.has(impLog.id)) {
          await db.aktivitaetsLog.add(impLog);
        }
      }
    });
  } catch (error) {
    console.error('Fehler beim Zusammenführen der Daten:', error);
    throw new Error('Fehler beim Zusammenführen der Daten.');
  }
}

/**
 * Overwrites all local tables with the provided state.
 * Important for spiegeling deletions.
 */
export async function datenUeberschreiben(
  importKinder: Kind[],
  importVorlagen: Listenvorlage[],
  importLogs: AktivitaetsLog[]
): Promise<void> {
  try {
    await db.transaction('rw', [db.kinder, db.vorlagen, db.aktivitaetsLog], async () => {
      await db.kinder.clear();
      await db.vorlagen.clear();
      await db.aktivitaetsLog.clear();

      if (importKinder.length > 0) await db.kinder.bulkAdd(importKinder);
      if (importVorlagen.length > 0) await db.vorlagen.bulkAdd(importVorlagen);
      if (importLogs.length > 0) await db.aktivitaetsLog.bulkAdd(importLogs);
    });
  } catch (error) {
    console.error('Fehler beim Überschreiben der lokalen Daten:', error);
    throw new Error('Fehler beim Überschreiben der lokalen Daten.');
  }
}

/**
 * Exports all database records (kinder, vorlagen, logs) to a JSON string.
 */
export async function datenExportieren(): Promise<string> {
  try {
    const kinder = await db.kinder.toArray();
    const vorlagen = await db.vorlagen.toArray();
    const aktivitaetsLog = await db.aktivitaetsLog.toArray();
    
    return JSON.stringify({
      version: 2,
      source: 'Kita-Listen-App',
      exportedAt: new Date().toISOString(),
      kinder,
      vorlagen,
      aktivitaetsLog
    }, null, 2);
  } catch (error) {
    console.error('Fehler beim Exportieren der Daten:', error);
    throw new Error('Der Datenexport ist fehlgeschlagen.');
  }
}

/**
 * Imports a JSON backup, validates it, and overwrites the entire database.
 * Supports both version 1 (kids only) and version 2 (kids, templates, and logs).
 */
export async function datenImportieren(jsonString: string): Promise<void> {
  try {
    const backup = JSON.parse(jsonString);
    
    // Simple validation
    if (!backup || !Array.isArray(backup.kinder)) {
      throw new Error('Ungültiges Backup-Format. Keine Kinderdaten gefunden.');
    }
    
    const importKinder: Kind[] = [];
    for (const item of backup.kinder) {
      if (!item.id || !item.vorname || !item.geburtsdatum || !item.gruppe) {
        throw new Error('Ungültiges Backup-Format. Ein oder mehrere Einträge enthalten unvollständige Kinderdaten.');
      }
      importKinder.push({
        id: item.id,
        vorname: item.vorname,
        geburtsdatum: item.geburtsdatum,
        gruppe: item.gruppe,
        letzteAktivitaetAm: item.letzteAktivitaetAm || undefined,
        besonderheiten: item.besonderheiten || undefined,
        geaendertAm: item.geaendertAm || new Date().toISOString()
      });
    }

    const importVorlagen: Listenvorlage[] = [];
    if (backup.version >= 2 && Array.isArray(backup.vorlagen)) {
      for (const item of backup.vorlagen) {
        if (!item.id || !item.name || !item.filterOptionen) {
          throw new Error('Ungültiges Backup-Format. Ein oder mehrere Einträge enthalten unvollständige Vorlagendaten.');
        }
        importVorlagen.push({
          id: item.id,
          name: item.name,
          beschreibung: item.beschreibung || undefined,
          filterOptionen: {
            alterVon: item.filterOptionen.alterVon,
            alterBis: item.filterOptionen.alterBis,
            gruppen: Array.isArray(item.filterOptionen.gruppen) ? item.filterOptionen.gruppen : [],
            anzahl: item.filterOptionen.anzahl,
            zufallsauswahl: !!item.filterOptionen.zufallsauswahl
          },
          erstelltAm: item.erstelltAm,
          zuletztVerwendetAm: item.zuletztVerwendetAm || undefined,
          geaendertAm: item.geaendertAm || new Date().toISOString()
        });
      }
    }

    const importLogs: AktivitaetsLog[] = [];
    if (backup.version >= 2 && Array.isArray(backup.aktivitaetsLog)) {
      for (const item of backup.aktivitaetsLog) {
        if (!item.id || !item.vorlagenId || !item.kindId || !item.datum) {
          throw new Error('Ungültiges Backup-Format. Ein oder mehrere Einträge enthalten unvollständige Aktivitätslogdaten.');
        }
        importLogs.push({
          id: item.id,
          vorlagenId: item.vorlagenId,
          kindId: item.kindId,
          datum: item.datum,
          geaendertAm: item.geaendertAm || new Date().toISOString()
        });
      }
    }
    
    // Clear and bulk insert within a single database transaction
    await db.transaction('rw', [db.kinder, db.vorlagen, db.aktivitaetsLog], async () => {
      await db.kinder.clear();
      await db.vorlagen.clear();
      await db.aktivitaetsLog.clear();
      
      await db.kinder.bulkAdd(importKinder);
      if (importVorlagen.length > 0) {
        await db.vorlagen.bulkAdd(importVorlagen);
      }
      if (importLogs.length > 0) {
        await db.aktivitaetsLog.bulkAdd(importLogs);
      }
    });
  } catch (error: any) {
    console.error('Fehler beim Importieren der Daten:', error);
    throw new Error(error.message || 'Der Datenimport ist fehlgeschlagen. Bitte prüfe die JSON-Datei.');
  }
}
