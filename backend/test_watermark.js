import { PDFDocument, PDFName, PDFArray } from 'pdf-lib';
import fs from 'fs';

async function test() {
    const pdfBytes = fs.readFileSync('C:\\SIH\\SIH26237\\sample.pdf');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    const font = await pdfDoc.embedFont('Helvetica');
    const fontKey = firstPage.node.newFontDictionary('F_WM', font.ref);

    const watermarkText = `WM:12345`;
    const contentStream = `
    BT
    /F_WM 1 Tf
    3 Tr
    1 0 0 1 5 5 Tm
    (${watermarkText}) Tj
    ET
  `;

    const { context } = pdfDoc;
    const streamRef = context.register(
        context.stream(contentStream)
    );
    const existingContents = firstPage.node.get(PDFName.of('Contents'));
    
    let contentsArray;
    if (existingContents instanceof PDFArray) {
        contentsArray = existingContents.clone();
        contentsArray.push(streamRef);
    } else {
        contentsArray = context.obj([existingContents, streamRef]);
    }
    
    firstPage.node.set(PDFName.of('Contents'), contentsArray);

    const modifiedPdfBytes = await pdfDoc.save();
    fs.writeFileSync('test_output.pdf', modifiedPdfBytes);
    console.log('Saved to test_output.pdf');
}

test().catch(console.error);
