import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';

async function createSamplePdf() {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const { width, height } = page.getSize();

  const drawTextCenter = (text, font, size, y, color = rgb(0, 0, 0)) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (width - textWidth) / 2,
      y,
      size,
      font,
      color,
    });
  };

  // Header
  drawTextCenter('TOP SECRET // CONFIDENTIAL', timesRomanBold, 16, height - 50, rgb(0.8, 0.1, 0.1));
  
  page.drawLine({
    start: { x: 50, y: height - 65 },
    end: { x: width - 50, y: height - 65 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  drawTextCenter('MINISTRY OF DEFENCE', timesRomanBold, 20, height - 100);
  drawTextCenter('INDIAN NAVY WESEE', timesRomanBold, 16, height - 125);

  page.drawText('Date: 27 September 2026', { x: 50, y: height - 170, size: 12, font: timesRomanFont });
  page.drawText('Ref: WESEE/CYBER/2026-004', { x: width - 220, y: height - 170, size: 12, font: timesRomanFont });

  page.drawText('SUBJECT: DEPLOYMENT OF POST-QUANTUM CRYPTOGRAPHY', { 
    x: 50, y: height - 220, size: 13, font: timesRomanBold 
  });

  const bodyText = `This document outlines the strategic implementation of ML-KEM and ML-DSA across frontline maritime communication networks. Due to the rising threat of Harvest-Now-Decrypt-Later (HNDL) attacks by adversarial nation-states, all legacy RSA/ECC keys must be rotated to quantum-resistant standards by Q4 2026.

1. Phase 1: Submarine Communications Network (SCN) upgrade.
2. Phase 2: Shore-to-Ship telemetry encryption.
3. Phase 3: ProvenanceVault integration for document attribution.

WARNING: Unauthorized disclosure of this document is a violation of the Official Secrets Act, 1923. Forensic watermarks are embedded within this document to attribute leaks to the exact recipient.`;

  page.drawText(bodyText, {
    x: 50,
    y: height - 260,
    size: 12,
    font: timesRomanFont,
    lineHeight: 20,
    maxWidth: width - 100,
  });

  drawTextCenter('TOP SECRET // CONFIDENTIAL', timesRomanBold, 16, 50, rgb(0.8, 0.1, 0.1));

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('C:\\SIH\\SIH26237\\sample.pdf', pdfBytes);
  console.log('Sample PDF created successfully at C:\\SIH\\SIH26237\\sample.pdf');
}

createSamplePdf().catch(console.error);
