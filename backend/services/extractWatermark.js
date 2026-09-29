import { PDFParse } from 'pdf-parse';

export async function extractWatermark(pdfBuffer) {
    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();
    const text = result.text;

    await parser.destroy();

    const match = text.match(/WM:([a-f0-9]{64})/);
    if (!match) {
        return null;
    }
    return match[1];
}