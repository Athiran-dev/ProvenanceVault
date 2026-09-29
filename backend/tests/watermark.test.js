import fs from 'fs';
import { generateWatermarkId, embedWatermark } from '../services/watermark.js';
import { extractWatermark } from '../services/extractWatermark.js';

async function runTest() {
    console.log("=== Watermark Embed/Extract Test ===");

    // 1. Load sample PDF
    const originalPdfBytes = fs.readFileSync('./sample.pdf');

    // 2. Generate a watermark ID (simulating a recipient decrypting)
    const { watermarkId, timestamp } = generateWatermarkId("recipient-A", "session-nonce-123");
    console.log("Generated Watermark ID:", watermarkId);

    // 3. Embed watermark into PDF
    const watermarkedPdfBytes = await embedWatermark(originalPdfBytes, watermarkId);
    fs.writeFileSync('./watermarked.pdf', watermarkedPdfBytes);
    console.log("Watermarked PDF saved as watermarked.pdf");

    // 4. Extract watermark from the watermarked PDF
    const watermarkedBuffer = fs.readFileSync('./watermarked.pdf');
    const extractedId = await extractWatermark(watermarkedBuffer);
    console.log("Extracted Watermark ID:", extractedId);

    // 5. Verify match
    const match = extractedId === watermarkId;
    console.log("Watermark match:", match);
}

runTest().catch(console.error);