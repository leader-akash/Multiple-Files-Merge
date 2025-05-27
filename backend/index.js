//  accept to include .ppt, .pptx, .xls, .xlsx: accept=".pdf,.doc,.docx,.rtf,.txt,.ppt,.pptx,.xls,.xlsx".

const express = require('express');
const multer = require('multer');
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const mammoth = require('mammoth');
const libre = require('libreoffice-convert');
const paymentRouter = require('./router/paymentRouter'); 
const dotenv = require('dotenv');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/payment', paymentRouter); 

const PORT = process.env.PORT || 5000;


// Configure Multer for file uploads with size limit
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadDir, { recursive: true });

// Function to convert files to PDF using LibreOffice (for .doc, .rtf, .ppt, .pptx, .xls, .xlsx)
async function convertWithLibreOffice(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    fs.readFile(inputPath).then((buf) => {
      libre.convert(buf, '.pdf', undefined, (err, pdfBuf) => {
        if (err) {
          return reject(err);
        }
        fs.writeFile(outputPath, pdfBuf).then(() => resolve()).catch(reject);
      });
    }).catch(reject);
  });
}

// Function to convert DOCX to PDF using Mammoth and Puppeteer
async function convertDocxToPDF(filePath, outputPath) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Extract content from DOCX using mammoth
  const { value: htmlContent } = await mammoth.convertToHtml({ path: filePath });
  
  // Set HTML content in Puppeteer
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  // Get content dimensions to infer orientation
  const dimensions = await page.evaluate(() => {
    const { width, height } = document.body.getBoundingClientRect();
    return { width, height };
  });

  // Set PDF page size based on content (approximate orientation)
  const isLandscape = dimensions.width > dimensions.height;
  await page.pdf({
    path: outputPath,
    width: isLandscape ? '842px' : '595px', // A4 landscape or portrait
    height: isLandscape ? '595px' : '842px',
    printBackground: true,
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
  });

  await browser.close();
}

// Function to convert TXT to PDF using Puppeteer
async function convertTxtToPDF(filePath, outputPath) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Read text content and wrap in basic HTML
  const content = await fs.readFile(filePath, 'utf-8');
  await page.setContent(`<pre style="font-family: Arial, sans-serif; padding: 20px;">${content}</pre>`, {
    waitUntil: 'networkidle0',
  });

  // Use default A4 portrait for TXT (no inherent orientation)
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
  });

  await browser.close();
}

// Function to merge PDFs while preserving page sizes
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

    // Convert each file to PDF based on type
    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const pdfPath = path.join(uploadDir, `${file.filename}.pdf`);

      if (ext === '.pdf') {
        // Copy PDF directly (preserves original size/orientation)
        await fs.copyFile(file.path, pdfPath);
      } else if (ext === '.docx') {
        // Convert DOCX using Mammoth and Puppeteer (with orientation detection)
        await convertDocxToPDF(file.path, pdfPath);
      } else if (ext === '.doc' || ext === '.rtf' || ext === '.ppt' || ext === '.pptx' || ext === '.xls' || ext === '.xlsx') {
        // Convert DOC/RTF/PPT/XLS using LibreOffice
        await convertWithLibreOffice(file.path, pdfPath);
      } else if (ext === '.txt') {
        // Convert TXT using Puppeteer
        await convertTxtToPDF(file.path, pdfPath);
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
    res.status(500).json({ error: `Failed to merge files: ${error.message}` });
  }
});


app.post('/create-checkout-session', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        // Provide the exact Price ID (for example, price_1234) of the product you want to sell
        price: '{{PRICE_ID}}',
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${PORT}?success=true`,
    cancel_url: `${PORT}?canceled=true`,
  });

  res.redirect(303, session.url);
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

