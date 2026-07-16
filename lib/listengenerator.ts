import { Kind, FilterOptionen } from '@/types';
import { berechneAlter } from './alter';

/**
 * Filters a list of children based on age range and group selections.
 */
export function kinderFiltern(kinder: Kind[], filter: FilterOptionen): Kind[] {
  return kinder.filter((kind) => {
    // 1. Group Filter (if groups are selected, match them; if empty, include all)
    if (filter.gruppen.length > 0 && !filter.gruppen.includes(kind.gruppe)) {
      return false;
    }

    // Calculate age in full years
    const alter = berechneAlter(kind.geburtsdatum);

    // 2. Minimum Age Filter
    if (filter.alterVon !== undefined && alter < filter.alterVon) {
      return false;
    }

    // 3. Maximum Age Filter
    if (filter.alterBis !== undefined && alter > filter.alterBis) {
      return false;
    }

    return true;
  });
}

/**
 * Selects children from the filtered list using manual selections, random selection, and rotation logic.
 * 
 * Logic flow:
 * 1. Manually pinned children (manuellGewaehltIds) are always selected first.
 * 2. If the desired limit is not reached, the remaining slots are filled from the other candidates.
 * 3. If zufallsauswahl is active, rotation logic is applied to the remaining candidates:
 *    - Children who have never done this activity (no date in 'aktivitaetsDaten' or 'letzteAktivitaetAm')
 *      or whose participation was longest ago are prioritized.
 *    - If multiple children have the same priority, we select randomly among them.
 * 4. If zufallsauswahl is not active, we sort the remaining candidates alphabetically and select.
 */
export function kinderAuswaehlen(
  gefiltert: Kind[],
  anzahl: number | undefined,
  zufallsauswahl: boolean,
  aktivitaetsDaten?: Map<string, string>,
  manuellGewaehltIds?: string[]
): Kind[] {
  const limit = anzahl !== undefined && anzahl > 0 ? anzahl : gefiltert.length;

  // 1. Extract manually pinned kids that are part of the filtered pool
  const pinnedIds = manuellGewaehltIds || [];
  const pinned = gefiltert.filter((k) => pinnedIds.includes(k.id));
  
  // If we already have enough pinned kids, just return the first 'limit' pinned kids (alphabetically)
  if (pinned.length >= limit) {
    return [...pinned]
      .sort((a, b) => a.vorname.localeCompare(b.vorname, 'de'))
      .slice(0, limit);
  }

  // 2. Extract remaining candidates (those who aren't pinned)
  const remainingCandidates = gefiltert.filter((k) => !pinnedIds.includes(k.id));
  let nochBenoetigt = limit - pinned.length;

  let restAuswahl: Kind[] = [];

  // If no more kids are needed or no candidates left, we are done
  if (nochBenoetigt > 0 && remainingCandidates.length > 0) {
    if (remainingCandidates.length <= nochBenoetigt) {
      // If we have fewer candidates than we need, take all of them
      restAuswahl = [...remainingCandidates];
    } else if (!zufallsauswahl) {
      // Non-random mode: Sort alphabetically and take the first N
      restAuswahl = [...remainingCandidates]
        .sort((a, b) => a.vorname.localeCompare(b.vorname, 'de'))
        .slice(0, nochBenoetigt);
    } else {
      // Random / Rotation selection mode
      // Group remaining candidates by their last activity date
      const gruppenNachDatum: { [datum: string]: Kind[] } = {};
      
      for (const kind of remainingCandidates) {
        // Determine the activity date to use:
        // Use template-specific date from 'aktivitaetsDaten' if provided, otherwise fallback to global date.
        const datumKey = aktivitaetsDaten 
          ? (aktivitaetsDaten.get(kind.id) || '') 
          : (kind.letzteAktivitaetAm || '');
          
        if (!gruppenNachDatum[datumKey]) {
          gruppenNachDatum[datumKey] = [];
        }
        gruppenNachDatum[datumKey].push(kind);
      }

      // Sort dates: empty string (never) first, then oldest dates ascending
      const sortierteDaten = Object.keys(gruppenNachDatum).sort((a, b) => {
        if (a === '') return -1;
        if (b === '') return 1;
        return a.localeCompare(b);
      });

      for (const datum of sortierteDaten) {
        const kinderInGruppe = gruppenNachDatum[datum];
        
        if (kinderInGruppe.length <= nochBenoetigt) {
          restAuswahl.push(...kinderInGruppe);
          nochBenoetigt -= kinderInGruppe.length;
        } else {
          // Select randomly within this date group
          const gemischteGruppe = [...kinderInGruppe].sort(() => Math.random() - 0.5);
          const auswahl = gemischteGruppe.slice(0, nochBenoetigt);
          restAuswahl.push(...auswahl);
          nochBenoetigt = 0;
        }

        if (nochBenoetigt === 0) {
          break;
        }
      }
    }
  }

  // Combine pinned kids and dynamically selected kids, then sort alphabetically by name
  return [...pinned, ...restAuswahl].sort((a, b) => a.vorname.localeCompare(b.vorname, 'de'));
}
