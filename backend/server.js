const express = require('express');
const multer = require('multer');
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Configure Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadDir, { recursive: true });

// Function to convert DOC/DOCX to PDF using Puppeteer
async function convertToPDF(filePath, outputPath) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Convert DOC/DOCX to HTML-like content (simplified for demo)
  // In production, use a library like mammoth.js for DOCX parsing
  const content = await fs.readFile(filePath, 'utf-8');
  await page.setContent(`<pre>${content}</pre>`); // Simplified: assumes text content

  await page.pdf({
    path: outputPath,
    format: 'A4',
  });

  await browser.close();
}

// Function to merge PDFs
async function mergePDFs(pdfPaths, outputPath) {
  const mergedPdf = await PDFDocument.create();
  
  for (const pdfPath of pdfPaths) {
    const pdfBytes = await fs.readFile(pdfPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedPdfBytes = await mergedPdf.save();
  await fs.writeFile(outputPath, mergedPdfBytes);
}

// API endpoint for file upload and merging
app.post('/api/merge', upload.array('files'), async (req, res) => {
  try {
    const files = req.files;
    const pdfPaths = [];

    // Convert each file to PDF if needed
    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const pdfPath = path.join(uploadDir, `${file.filename}.pdf`);

      if (ext === '.pdf') {
        // Copy PDF directly
        await fs.copyFile(file.path, pdfPath);
      } else if (ext === '.doc' || ext === '.docx') {
        // Convert DOC/DOCX to PDF
        await convertToPDF(file.path, pdfPath);
      } else {
        throw new Error(`Unsupported file type: ${ext}`);
      }
      pdfPaths.push(pdfPath);
    }

    // Merge PDFs
    const outputPath = path.join(uploadDir, `merged-${Date.now()}.pdf`);
    await mergePDFs(pdfPaths, outputPath);

    // Send merged PDF
    res.download(outputPath, 'merged.pdf', async (err) => {
      if (err) {
        console.error('Error sending file:', err);
      }
      // Cleanup
      for (const pdfPath of pdfPaths) {
        await fs.unlink(pdfPath).catch(() => {});
      }
      await fs.unlink(outputPath).catch(() => {});
      for (const file of files) {
        await fs.unlink(file.path).catch(() => {});
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to merge files' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));