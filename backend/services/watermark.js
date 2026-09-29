import { PDFDocument, PDFName, PDFString, PDFHexString } from 'pdf-lib';
import crypto from 'crypto';

export function generateWatermarkId(recipientId, sessionNonce) {
    const timestamp = Date.now().toString();
    const raw = `${recipientId}:${sessionNonce}:${timestamp}`;
    const watermarkId = crypto.createHash('sha256').update(raw).digest('hex');
    return { watermarkId, timestamp };
}

export async function embedWatermark(pdfBytes, watermarkId) {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // Embed a standard font (needed to draw invisible text)
    const font = await pdfDoc.embedFont('Helvetica');
    const fontKey = firstPage.node.newFontDictionary('F_WM', font.ref);

    // Build raw content stream commands for invisible text (Tr 3 = invisible render mode)
    const watermarkText = `WM:${watermarkId}`;
    const contentStream = `
    BT
    /F_WM 1 Tf
    3 Tr
    1 0 0 1 5 5 Tm
    (${watermarkText}) Tj
    ET
  `;

    // Append this as a new content stream on the page
    const { context } = pdfDoc;
    const streamRef = context.register(
        context.stream(contentStream)
    );
    const existingContents = firstPage.node.get(PDFName.of('Contents'));
    let contentsArray;
    if (existingContents.constructor.name === 'PDFArray') {
        contentsArray = existingContents.clone();
        contentsArray.push(streamRef);
    } else {
        contentsArray = context.obj([existingContents, streamRef]);
    }
    firstPage.node.set(PDFName.of('Contents'), contentsArray);

    const modifiedPdfBytes = await pdfDoc.save();
    return modifiedPdfBytes;
}