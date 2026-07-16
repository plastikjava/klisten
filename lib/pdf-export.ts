import { jsPDF } from 'jspdf';
import { Kind } from '@/types';
import { formatierteAltersAngabe } from './alter';

/**
 * Generates a clean A4 PDF file of the filtered children list and triggers a download.
 */
export async function listeAlsPdfExportieren(kinder: Kind[], filterInfo: string): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const heuteStr = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Colors based on Design System
  const primarFarbe = [74, 144, 217]; // #4A90D9 - soft-blau
  const textDunkel = [51, 65, 85]; // slate-700
  const textHell = [100, 116, 139]; // slate-500
  const zeilenHintergrund = [248, 250, 252]; // slate-50

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(primarFarbe[0], primarFarbe[1], primarFarbe[2]);
  doc.text('Kita-Listen', 15, 20);

  // Subtitle/Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(textHell[0], textHell[1], textHell[2]);
  doc.text(`Generiert am: ${heuteStr}`, 155, 20);

  // Horizontal divider
  doc.setDrawColor(226, 232, 240); // border-slate-200
  doc.setLineWidth(0.5);
  doc.line(15, 24, 195, 24);

  // Filter Info (truncate if extremely long)
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(textHell[0], textHell[1], textHell[2]);
  const displayFilterInfo = filterInfo.length > 110 
    ? filterInfo.substring(0, 107) + '...' 
    : filterInfo;
  doc.text(`Filterkriterien: ${displayFilterInfo}`, 15, 30);

  // Columns layout definitions
  const spalten = [
    { name: 'Nr.', width: 10 },
    { name: 'Name', width: 45 },
    { name: 'Alter', width: 35 },
    { name: 'Gruppe', width: 30 },
    { name: 'Letzte Aktivität', width: 30 },
    { name: 'Besonderheiten', width: 30 },
  ];

  let startY = 36;
  const zeilenHoehe = 10;

  // Draw header row
  doc.setFillColor(primarFarbe[0], primarFarbe[1], primarFarbe[2]);
  doc.rect(15, startY, 180, zeilenHoehe, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);

  let currentX = 15;
  for (const spalte of spalten) {
    doc.text(spalte.name, currentX + 2, startY + 6.5);
    currentX += spalte.width;
  }

  // Draw child rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);

  let y = startY + zeilenHoehe;
  kinder.forEach((kind, index) => {
    // Page overflow check (A4 is 297mm high)
    if (y + zeilenHoehe > 275) {
      doc.addPage();
      y = 20;

      // Redraw table headers on new page
      doc.setFillColor(primarFarbe[0], primarFarbe[1], primarFarbe[2]);
      doc.rect(15, y, 180, zeilenHoehe, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);

      let headerX = 15;
      for (const spalte of spalten) {
        doc.text(spalte.name, headerX + 2, y + 6.5);
        headerX += spalte.width;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      y += zeilenHoehe;
    }

    // Zebra striping background
    if (index % 2 === 1) {
      doc.setFillColor(zeilenHintergrund[0], zeilenHintergrund[1], zeilenHintergrund[2]);
      doc.rect(15, y, 180, zeilenHoehe, 'F');
    }

    // Row boundary borders
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.1);
    doc.line(15, y + zeilenHoehe, 195, y + zeilenHoehe); // bottom line
    doc.line(15, y, 15, y + zeilenHoehe); // left border
    doc.line(195, y, 195, y + zeilenHoehe); // right border

    doc.setTextColor(textDunkel[0], textDunkel[1], textDunkel[2]);

    const nr = (index + 1).toString();
    const name = kind.vorname;
    const alter = formatierteAltersAngabe(kind.geburtsdatum);
    const gruppe = kind.gruppe;
    const letzteAktivitaet = kind.letzteAktivitaetAm
      ? new Date(kind.letzteAktivitaetAm).toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '-';
    const besonderheiten = kind.besonderheiten || '-';

    let dataX = 15;

    // Col 1: Nr.
    doc.text(nr, dataX + 2, y + 6.5);
    dataX += spalten[0].width;

    // Col 2: Name
    doc.text(name, dataX + 2, y + 6.5);
    dataX += spalten[1].width;

    // Col 3: Alter
    doc.text(alter, dataX + 2, y + 6.5);
    dataX += spalten[2].width;

    // Col 4: Gruppe
    doc.text(gruppe, dataX + 2, y + 6.5);
    dataX += spalten[3].width;

    // Col 5: Letzte Aktivität
    doc.text(letzteAktivitaet, dataX + 2, y + 6.5);
    dataX += spalten[4].width;

    // Col 6: Besonderheiten (Trimming long texts to avoid overlap)
    const maxChars = 18;
    const displayBesonderheiten = besonderheiten.length > maxChars
      ? besonderheiten.substring(0, maxChars - 3) + '...'
      : besonderheiten;
    doc.text(displayBesonderheiten, dataX + 2, y + 6.5);

    y += zeilenHoehe;
  });

  // Footer page numbering
  const totalSeiten = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalSeiten; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textHell[0], textHell[1], textHell[2]);
    doc.text(`Seite ${i} von ${totalSeiten}`, 105, 287, { align: 'center' });
  }

  // Trigger download in client browser
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`kita-liste_${dateStr}.pdf`);
}
