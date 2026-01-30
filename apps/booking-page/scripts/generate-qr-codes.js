/**
 * QR Code Generator for LMRC Boat Booking
 *
 * Generates QR codes for all boats with:
 * - LMRC logo overlay in center
 * - Boat name below QR code
 * - Individual PNG files
 * - Combined PDF sheet for printing
 */

const fs = require('fs').promises;
const path = require('path');
const QRCode = require('qrcode');
const sharp = require('sharp');
const axios = require('axios');
const PDFDocument = require('pdfkit');

// Configuration
const CONFIG = {
  baseURL: 'https://lakemacrowing.au/book-a-boat.html',
  logoURL: 'https://cdn.revolutionise.com.au/cups/lmrc2019/files/xhvxfyonk8gzzlr4.png',
  qrSize: 400,
  logoSize: 80,
  outputDir: 'qr-codes',
  fontSize: 16,
  fontFamily: 'Helvetica-Bold',
  textColor: '#0f172a',
  margin: 20,
  imageHeight: 480, // QR (400) + margin (20) + text (60)
};

/**
 * Download and cache the LMRC logo
 */
async function downloadLogo() {
  console.log('📥 Downloading LMRC logo...');

  try {
    const response = await axios.get(CONFIG.logoURL, {
      responseType: 'arraybuffer',
      timeout: 10000
    });

    const logoBuffer = Buffer.from(response.data);

    // Resize logo to fit in QR code center
    const resizedLogo = await sharp(logoBuffer)
      .resize(CONFIG.logoSize, CONFIG.logoSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toBuffer();

    console.log('✅ Logo downloaded and resized');
    return resizedLogo;

  } catch (error) {
    console.warn('⚠️  Failed to download logo, continuing without it:', error.message);
    return null;
  }
}

/**
 * Generate QR code with logo overlay and boat name
 */
async function generateQRCodeWithLogo(url, boatName, logoBuffer) {
  // Generate base QR code
  const qrBuffer = await QRCode.toBuffer(url, {
    errorCorrectionLevel: 'H', // High error correction for logo overlay
    width: CONFIG.qrSize,
    margin: 1,
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    }
  });

  // Load QR code with sharp
  let qrImage = sharp(qrBuffer);

  // Overlay logo if available
  if (logoBuffer) {
    const logoPosition = Math.floor((CONFIG.qrSize - CONFIG.logoSize) / 2);

    qrImage = qrImage.composite([
      {
        input: logoBuffer,
        top: logoPosition,
        left: logoPosition
      }
    ]);
  }

  // Get QR code with logo as buffer
  const qrWithLogo = await qrImage.png().toBuffer();

  // Create canvas with boat name below
  const textHeight = 60;
  const totalHeight = CONFIG.qrSize + textHeight;

  // Create SVG with text
  const textSVG = `
    <svg width="${CONFIG.qrSize}" height="${textHeight}">
      <rect width="${CONFIG.qrSize}" height="${textHeight}" fill="white"/>
      <text
        x="${CONFIG.qrSize / 2}"
        y="30"
        font-family="${CONFIG.fontFamily}"
        font-size="${CONFIG.fontSize}"
        fill="${CONFIG.textColor}"
        text-anchor="middle"
      >${boatName}</text>
    </svg>
  `;

  const textBuffer = Buffer.from(textSVG);

  // Combine QR code and text
  const finalImage = await sharp({
    create: {
      width: CONFIG.qrSize,
      height: totalHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([
    { input: qrWithLogo, top: 0, left: 0 },
    { input: textBuffer, top: CONFIG.qrSize, left: 0 }
  ])
  .png()
  .toBuffer();

  return finalImage;
}

/**
 * Sanitize filename
 */
function sanitizeFilename(str) {
  return str.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-');
}

/**
 * Generate QR codes for all boats
 */
async function generateAllQRCodes() {
  console.log('🚣 LMRC Boat Booking QR Code Generator\n');

  // Create output directory
  await fs.mkdir(CONFIG.outputDir, { recursive: true });
  console.log(`📁 Output directory: ${CONFIG.outputDir}\n`);

  // Load boats data
  const boatsData = JSON.parse(await fs.readFile('boats.json', 'utf-8'));

  // Filter to only bookable boats (those with a valid boat type)
  const allBoats = boatsData.boats;
  const boats = Object.fromEntries(
    Object.entries(allBoats).filter(([id, boat]) => boat.type && boat.type.trim() !== '')
  );

  const totalBoats = Object.keys(allBoats).length;
  const bookableBoats = Object.keys(boats).length;

  console.log(`📋 Found ${totalBoats} total boats, ${bookableBoats} are bookable (have valid type)\n`);

  // Download logo
  const logoBuffer = await downloadLogo();
  console.log('');

  // Generate QR codes for each boat
  const qrImages = [];
  let count = 0;
  const boatCount = bookableBoats;

  for (const [boatId, boat] of Object.entries(boats)) {
    count++;

    // Build URL
    const url = `${CONFIG.baseURL}?boat_id=${boatId}`;

    // Generate QR code with logo and boat name
    const qrBuffer = await generateQRCodeWithLogo(url, boat.name, logoBuffer);

    // Save individual image
    const filename = `QR-${boatId}-${sanitizeFilename(boat.name)}.png`;
    const filepath = path.join(CONFIG.outputDir, filename);
    await fs.writeFile(filepath, qrBuffer);

    console.log(`✅ [${count}/${boatCount}] ${boat.name} → ${filename}`);

    // Store for PDF generation
    qrImages.push({
      boatId,
      name: boat.name,
      buffer: qrBuffer,
      filename
    });
  }

  console.log(`\n✅ Generated ${qrImages.length} QR code images\n`);

  return qrImages;
}

/**
 * Create printable PDF sheet with all QR codes
 */
async function createPDFSheet(qrImages) {
  console.log('📄 Creating printable PDF sheet...\n');

  const pdfPath = path.join(CONFIG.outputDir, 'LMRC-Boat-QR-Codes-All.pdf');
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 40, left: 40, right: 40 }
  });

  const stream = doc.pipe(require('fs').createWriteStream(pdfPath));

  // PDF dimensions
  const pageWidth = 595.28; // A4 width in points
  const pageHeight = 841.89; // A4 height in points
  const margin = 40;
  const usableWidth = pageWidth - (margin * 2);
  const usableHeight = pageHeight - (margin * 2);

  // Grid layout: 2 columns x 3 rows per page
  const cols = 2;
  const rows = 3;
  const qrPerPage = cols * rows;

  // Calculate cell dimensions with padding
  const padding = 20; // Space between QR codes
  const cellWidth = (usableWidth - (padding * (cols - 1))) / cols;
  const cellHeight = (usableHeight - (padding * (rows - 1))) / rows;

  // Scale QR codes to fit in cells while maintaining aspect ratio
  const qrImageWidth = CONFIG.qrSize;
  const qrImageHeight = CONFIG.qrSize + 60; // QR + text
  const scaleToFit = Math.min(cellWidth / qrImageWidth, cellHeight / qrImageHeight) * 0.95;
  const scaledWidth = qrImageWidth * scaleToFit;
  const scaledHeight = qrImageHeight * scaleToFit;

  // Add title page
  doc.fontSize(24).font('Helvetica-Bold').text('LMRC Boat Booking', margin, margin);
  doc.fontSize(16).font('Helvetica').text('QR Code Directory', margin, margin + 40);
  doc.fontSize(12).text(`Total Boats: ${qrImages.length}`, margin, margin + 70);
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, margin, margin + 90);
  doc.fontSize(10).text('Scan QR codes to book boats directly', margin, margin + 110);
  doc.addPage();

  // Add QR codes in grid
  for (let i = 0; i < qrImages.length; i++) {
    const qr = qrImages[i];

    // Calculate position
    const pageIndex = Math.floor(i / qrPerPage);
    const positionOnPage = i % qrPerPage;
    const row = Math.floor(positionOnPage / cols);
    const col = positionOnPage % cols;

    // Calculate position with padding
    const x = margin + (col * (cellWidth + padding)) + (cellWidth - scaledWidth) / 2;
    const y = margin + (row * (cellHeight + padding)) + (cellHeight - scaledHeight) / 2;

    // Add page if needed
    if (i > 0 && positionOnPage === 0) {
      doc.addPage();
    }

    // Add QR code image (scaled to fit)
    doc.image(qr.buffer, x, y, { width: scaledWidth, height: scaledHeight });
  }

  doc.end();

  await new Promise(resolve => stream.on('finish', resolve));

  console.log(`✅ PDF created: ${pdfPath}\n`);
  console.log(`   Pages: ${Math.ceil(qrImages.length / qrPerPage) + 1} (includes title page)`);
  console.log(`   Layout: ${cols} columns × ${rows} rows per page\n`);
}

/**
 * Main function
 */
async function main() {
  try {
    const startTime = Date.now();

    // Generate all QR codes
    const qrImages = await generateAllQRCodes();

    // Create PDF sheet
    await createPDFSheet(qrImages);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('🎉 All done!\n');
    console.log(`📊 Summary:`);
    console.log(`   - QR codes generated: ${qrImages.length}`);
    console.log(`   - Individual images: ${CONFIG.outputDir}/QR-*.png`);
    console.log(`   - PDF sheet: ${CONFIG.outputDir}/LMRC-Boat-QR-Codes-All.pdf`);
    console.log(`   - Time taken: ${duration}s\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run
main();
