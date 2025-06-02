const { PDFDocument } = require('pdf-lib');
const path = require('path');
const mammoth = require('mammoth');
const libre = require('libreoffice-convert');
const sharp = require('sharp');
const puppeteer = require('puppeteer');

function getFileExtension(file) {
  let ext = path.extname(file.originalname || '').toLowerCase();
  if (!ext || ext === '.') {
    console.warn(`Invalid extension for ${file.originalname}, falling back to mimetype`);
    const mimeToExt = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/bmp': '.bmp',
      'image/gif': '.gif',
    };
    ext = mimeToExt[file.mimetype] || '';
  }
  return ext;
}

async function countPdfPages(buffer) {
  try {
    const pdfDoc = await PDFDocument.load(buffer);
    return pdfDoc.getPageCount();
  } catch (error) {
    throw new Error(`Failed to count PDF pages: ${error.message}`);
  }
}

async function estimateNonPdfPages(buffer, ext) {
  try {
    if (ext === '.docx') {
      const { value: htmlContent } = await mammoth.convertToHtml({ buffer });
      const wordCount = htmlContent.split(/\s+/).length;
      return Math.ceil(wordCount / 500) || 1;
    } else if (ext === '.txt') {
      const content = buffer.toString('utf-8');
      const lineCount = content.split('\n').length;
      return Math.ceil(lineCount / 50) || 1;
    } else if (['.doc', '.rtf', '.ppt', '.pptx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.bmp', '.gif'].includes(ext)) {
      return 1;
    }
    return 1;
  } catch (error) {
    throw new Error(`Failed to estimate pages: ${error.message}`);
  }
}

async function convertWithLibreOffice(inputBuffer, ext) {
  return new Promise((resolve, reject) => {
    libre.convert(inputBuffer, '.pdf', undefined, (err, pdfBuffer) => {
      if (err) {
        return reject(new Error(`LibreOffice conversion failed: ${err.message}`));
      }
      resolve(pdfBuffer);
    });
  });
}

async function convertDocxToPDF(buffer) {
  try {
    const browser = await puppeteer.launch({ headless: 'new', timeout: 30000 });
    const page = await browser.newPage();
    const { value: htmlContent } = await mammoth.convertToHtml({ buffer });
    await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 15000 });
    const dimensions = await page.evaluate(() => {
      const { width, height } = document.body.getBoundingClientRect();
      return { width, height };
    });
    const isLandscape = dimensions.width > dimensions.height;
    const pdfBuffer = await page.pdf({
      width: isLandscape ? '842px' : '595px',
      height: isLandscape ? '595px' : '842px',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    });
    await browser.close();
    return pdfBuffer;
  } catch (error) {
    throw new Error(`DOCX to PDF conversion failed: ${error.message}`);
  }
}

async function convertTxtToPDF(buffer) {
  try {
    const browser = await puppeteer.launch({ headless: 'new', timeout: 30000 });
    const page = await browser.newPage();
    const content = buffer.toString('utf-8');
    await page.setContent(`<pre style="font-family: Arial, sans-serif; padding: 20px;">${content}</pre>`, {
      waitUntil: 'networkidle0',
      timeout: 15000,
    });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    });
    await browser.close();
    return pdfBuffer;
  } catch (error) {
    throw new Error(`TXT to PDF conversion failed: ${error.message}`);
  }
}

async function convertImageToPDF(buffer, originalFileName) {
  try {
    const ext = getFileExtension({ originalname: originalFileName });
    if (!['.jpg', '.jpeg', '.png', '.bmp', '.gif'].includes(ext)) {
      throw new Error(`Unsupported image format: ${ext || 'unknown'}`);
    }

    const metadata = await sharp(buffer).metadata();
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    let image;

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Image processing timed out')), 10000);
    });

    if (ext === '.jpg' || ext === '.jpeg') {
      image = await Promise.race([pdfDoc.embedJpg(buffer), timeoutPromise]);
    } else if (ext === '.png') {
      image = await Promise.race([pdfDoc.embedPng(buffer), timeoutPromise]);
    } else if (['.bmp', '.gif'].includes(ext)) {
      const pngBuffer = await Promise.race([
        sharp(buffer).png().resize({ width: 1920, withoutEnlargement: true }).toBuffer(),
        timeoutPromise,
      ]);
      image = await Promise.race([pdfDoc.embedPng(pngBuffer), timeoutPromise]);
    }

    const { width, height } = metadata;
    const isLandscape = width > height;
    const maxWidth = 595;
    const maxHeight = 842;
    const scale = Math.min(maxWidth / width, maxHeight / height, 1);
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;

    page.setSize(isLandscape ? maxHeight : maxWidth, isLandscape ? maxWidth : maxHeight);
    page.drawImage(image, { x: 0, y: 0, width: scaledWidth, height: scaledHeight });

    return await pdfDoc.save();
  } catch (error) {
    throw new Error(`Image conversion failed: ${error.message}`);
  }
}

async function mergePDFs(pdfBuffers) {
  try {
    const mergedPdf = await PDFDocument.create();
    for (const pdfBuffer of pdfBuffers) {
      const pdf = await PDFDocument.load(pdfBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    return await mergedPdf.save();
  } catch (error) {
    throw new Error(`PDF merge failed: ${error.message}`);
  }
}

module.exports = {
  getFileExtension,
  countPdfPages,
  estimateNonPdfPages,
  convertWithLibreOffice,
  convertDocxToPDF,
  convertTxtToPDF,
  convertImageToPDF,
  mergePDFs,
};