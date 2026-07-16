/**
 * Calculates the exact age in years from a birthdate.
 */
export function berechneAlter(geburtsdatum: string): number {
  if (!geburtsdatum) return 0;
  
  const geburtsTag = new Date(geburtsdatum);
  const heute = new Date();
  
  let alter = heute.getFullYear() - geburtsTag.getFullYear();
  const monatsDifferenz = heute.getMonth() - geburtsTag.getMonth();
  
  if (
    monatsDifferenz < 0 || 
    (monatsDifferenz === 0 && heute.getDate() < geburtsTag.getDate())
  ) {
    alter--;
  }
  
  return alter;
}

/**
 * Formats the age nicely into German text.
 * For children under 3 years, it shows both years and months (e.g., "1 Jahr, 4 Monate" or "10 Monate").
 * For children 3 years and older, it just shows years (e.g., "4 Jahre").
 */
export function formatierteAltersAngabe(geburtsdatum: string): string {
  if (!geburtsdatum) return '';
  
  const geburtsTag = new Date(geburtsdatum);
  const heute = new Date();
  
  let jahre = heute.getFullYear() - geburtsTag.getFullYear();
  let monate = heute.getMonth() - geburtsTag.getMonth();
  let tage = heute.getDate() - geburtsTag.getDate();
  
  if (tage < 0) {
    monate--;
  }
  
  if (monate < 0) {
    jahre--;
    monate += 12;
  }
  
  if (jahre >= 3) {
    return jahre === 1 ? '1 Jahr' : `${jahre} Jahre`;
  } else {
    // Under 3 years: show detailed age in years and months
    const jahreStr = jahre > 0 ? (jahre === 1 ? '1 Jahr' : `${jahre} Jahre`) : '';
    const monateStr = monate > 0 ? (monate === 1 ? '1 Monat' : `${monate} Monate`) : '';
    
    if (jahreStr && monateStr) {
      return `${jahreStr}, ${monateStr}`;
    } else if (jahreStr) {
      return jahreStr;
    } else if (monateStr) {
      return monateStr;
    } else {
      return 'unter 1 Monat';
    }
  }
}
