const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User, Subscription, Plan, Transaction } = require('../modal/models');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_KEY);
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const mammoth = require('mammoth');
const libre = require('libreoffice-convert');
const sharp = require('sharp');
const puppeteer = require('puppeteer');

const app = express();

// Authentication Middleware
function authenticateToken(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// User Signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    const user = new User({ email, password });
    await user.save();
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: `Signup failed: ${error.message}` });
  }
});

// User Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: `Login failed: ${error.message}` });
  }
});

// Get Available Plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await Plan.find();
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch plans: ${error.message}` });
  }
});

// Configure Multer for file uploads with size limit
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Multer error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File size limit exceeded (50MB max)' });
  }
  next(err);
});

// Function to count pages in a PDF file
async function countPdfPages(filePath) {
  try {
    const pdfBytes = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    return pdfDoc.getPageCount();
  } catch (error) {
    throw new Error(`Failed to count PDF pages: ${error.message}`);
  }
}

// Function to estimate pages for non-PDF files
async function estimateNonPdfPages(filePath, ext) {
  try {
    if (ext === '.docx') {
      const { value: htmlContent } = await mammoth.convertToHtml({ path: filePath });
      const wordCount = htmlContent.split(/\s+/).length;
      return Math.ceil(wordCount / 500) || 1;
    } else if (ext === '.txt') {
      const content = await fs.readFile(filePath, 'utf-8');
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

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadDir, { recursive: true });

// Function to convert files to PDF using LibreOffice
async function convertWithLibreOffice(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    fs.readFile(inputPath)
      .then((buf) => {
        libre.convert(buf, '.pdf', undefined, (err, pdfBuf) => {
          if (err) {
            return reject(new Error(`LibreOffice conversion failed: ${err.message}`));
          }
          fs.writeFile(outputPath, pdfBuf)
            .then(() => resolve())
            .catch(reject);
        });
      })
      .catch(reject);
  });
}

// Function to convert DOCX to PDF using Mammoth and Puppeteer
async function convertDocxToPDF(filePath, outputPath) {
  try {
    const browser = await puppeteer.launch({ headless: 'new', timeout: 30000 });
    const page = await browser.newPage();
    const { value: htmlContent } = await mammoth.convertToHtml({ path: filePath });
    await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 15000 });
    const dimensions = await page.evaluate(() => {
      const { width, height } = document.body.getBoundingClientRect();
      return { width, height };
    });
    const isLandscape = dimensions.width > dimensions.height;
    await page.pdf({
      path: outputPath,
      width: isLandscape ? '842px' : '595px',
      height: isLandscape ? '595px' : '842px',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    });
    await browser.close();
  } catch (error) {
    throw new Error(`DOCX to PDF conversion failed: ${error.message}`);
  }
}

// Function to convert TXT to PDF using Puppeteer
async function convertTxtToPDF(filePath, outputPath) {
  try {
    const browser = await puppeteer.launch({ headless: 'new', timeout: 30000 });
    const page = await browser.newPage();
    const content = await fs.readFile(filePath, 'utf-8');
    await page.setContent(`<pre style="font-family: Arial, sans-serif; padding: 20px;">${content}</pre>`, {
      waitUntil: 'networkidle0',
      timeout: 15000,
    });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    });
    await browser.close();
  } catch (error) {
    throw new Error(`TXT to PDF conversion failed: ${error.message}`);
  }
}

// Function to get file extension from filename or mimetype
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

// Function to convert images to PDF using pdf-lib
async function convertImageToPDF(filePath, outputPath, originalFileName) {
  try {
    const ext = getFileExtension({ originalname: originalFileName, path: filePath });
    console.log(`Processing image: ${originalFileName}, extension: ${ext}`);

    if (!['.jpg', '.jpeg', '.png', '.bmp', '.gif'].includes(ext)) {
      throw new Error(`Unsupported image format: ${ext || 'unknown'}. Supported formats: .jpg, .jpeg, .png, .bmp, .gif`);
    }

    const imageBytes = await fs.readFile(filePath);
    const metadata = await sharp(imageBytes).metadata().catch((err) => {
      throw new Error(`Invalid or corrupted image: ${err.message}`);
    });
    console.log(`Image metadata: ${JSON.stringify(metadata)}`);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    let image;

    // Timeout for image processing
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Image processing timed out')), 10000);
    });

    if (ext === '.jpg' || ext === '.jpeg') {
      image = await Promise.race([pdfDoc.embedJpg(imageBytes), timeoutPromise]);
    } else if (ext === '.png') {
      image = await Promise.race([pdfDoc.embedPng(imageBytes), timeoutPromise]);
    } else if (['.bmp', '.gif'].includes(ext)) {
      const pngBuffer = await Promise.race([
        sharp(imageBytes).png().resize({ width: 1920, withoutEnlargement: true }).toBuffer(),
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

    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);
    console.log(`Image converted to PDF: ${outputPath}`);
  } catch (error) {
    console.error(`Image conversion error for ${originalFileName}: ${error.message}`);
    throw error;
  }
}

// Function to merge PDFs
async function mergePDFs(pdfPaths, outputPath) {
  try {
    const mergedPdf = await PDFDocument.create();
    for (const pdfPath of pdfPaths) {
      console.log(`Merging PDF: ${pdfPath}`);
      const pdfBytes = await fs.readFile(pdfPath);
      const pdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    const mergedPdfBytes = await mergedPdf.save();
    await fs.writeFile(outputPath, mergedPdfBytes);
    console.log(`Merged PDF created: ${outputPath}`);
  } catch (error) {
    console.error(`Merge error: ${error.message}`);
    throw new Error(`PDF merge failed: ${error.message}`);
  }
}

// Merge Route
router.post('/merge', authenticateToken, upload.array('files'), async (req, res) => {
  let pdfPaths = [];
  let outputPath = '';
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    let limits = { fileLimit: 3, pageLimit: 400 };
    let isSubscribed = false;

    if (req.user) {
      const subscription = await Subscription.findOne({
        userId: req.user.userId,
        status: 'active',
      }).populate('planId');
      if (subscription) {
        limits = {
          fileLimit: subscription.planId.fileLimit,
          pageLimit: subscription.planId.pageLimit,
        };
        isSubscribed = true;
      }
    }

    let totalPages = 0;
    for (const file of files) {
      const ext = getFileExtension(file);
      console.log(`Processing file: ${file.originalname}, extension: ${ext}, mimetype: ${file.mimetype}`);
      if (ext === '.pdf') {
        totalPages += await countPdfPages(file.path);
      } else {
        totalPages += await estimateNonPdfPages(file.path, ext);
      }
    }

    if (files.length > limits.fileLimit) {
      return res.status(403).json({
        error: `File count ${files.length} exceeds limit of ${limits.fileLimit}. ${
          isSubscribed ? 'Upgrade your plan.' : 'Sign up and purchase a plan for higher limits.'
        }`,
        showPurchase: true,
        requireLogin: !isSubscribed,
      });
    }

    if (totalPages > limits.pageLimit) {
      return res.status(403).json({
        error: `Total page count ${totalPages} exceeds limit of ${limits.pageLimit}. ${
          isSubscribed ? 'Upgrade your plan.' : 'Sign up and purchase a plan for higher limits.'
        }`,
        showPurchase: true,
        requireLogin: !isSubscribed,
      });
    }

    for (const file of files) {
      const ext = getFileExtension(file);
      const pdfPath = path.join(uploadDir, `${file.filename}.pdf`);
      pdfPaths.push(pdfPath);

      try {
        if (ext === '.pdf') {
          await fs.copyFile(file.path, pdfPath);
        } else if (ext === '.docx') {
          await convertDocxToPDF(file.path, pdfPath);
        } else if (['.doc', '.rtf', '.ppt', '.pptx', '.xls', '.xlsx'].includes(ext)) {
          await convertWithLibreOffice(file.path, pdfPath);
        } else if (ext === '.txt') {
          await convertTxtToPDF(file.path, pdfPath);
        } else if (['.jpg', '.jpeg', '.png', '.bmp', '.gif'].includes(ext)) {
          await convertImageToPDF(file.path, pdfPath, file.originalname);
        } else {
          throw new Error(`Unsupported file type: ${ext || 'unknown'}. Supported formats: .pdf, .doc, .docx, .rtf, .txt, .ppt, .pptx, .xls, .xlsx, .jpg, .jpeg, .png, .bmp, .gif`);
        }
        console.log(`Converted file: ${file.originalname} to ${pdfPath}`);
      } catch (error) {
        throw new Error(`Conversion failed for ${file.originalname}: ${error.message}`);
      }
    }

    outputPath = path.join(uploadDir, `merged-${Date.now()}.pdf`);
    await mergePDFs(pdfPaths, outputPath);

    res.download(outputPath, 'merged.pdf', (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({ error: `Failed to send merged PDF: ${err.message}` });
      }
      // Cleanup after sending response
      for (const pdfPath of pdfPaths) {
        fs.unlink(pdfPath).catch(() => {});
      }
      if (outputPath) {
        fs.unlink(outputPath).catch(() => {});
      }
      for (const file of req.files || []) {
        fs.unlink(file.path).catch(() => {});
      }
    });
  } catch (error) {
    console.error('Merge error:', error);
    res.status(500).json({ error: `Failed to merge files: ${error.message}` });
    // Cleanup on error
    for (const pdfPath of pdfPaths) {
      fs.unlink(pdfPath).catch(() => {});
    }
    if (outputPath) {
      fs.unlink(outputPath).catch(() => {});
    }
    for (const file of req.files || []) {
      fs.unlink(file.path).catch(() => {});
    }
  }
});

// Create Subscription
router.post('/subscription', authenticateToken, async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user.userId;
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    const session = await stripe.checkout.sessions.create({
      customer_email: (await User.findById(userId)).email,
      payment_method_types: ['card'],
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      mode: 'subscription',
      success_url: 'http://localhost:5173/?success=true',
      cancel_url: 'http://localhost:5173/cancel',
    });
    const subscription = new Subscription({
      userId,
      planId,
      stripeSubscriptionId: session.id,
      status: 'pending',
      startDate: new Date(),
    });
    await subscription.save();
    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: `Failed to create subscription: ${error.message}` });
  }
});

// Stripe Webhook for Subscription Events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const subscription = await Subscription.findOne({ stripeSubscriptionId: session.id });
      if (subscription) {
        subscription.status = 'active';
        subscription.stripeSubscriptionId = session.subscription;
        subscription.endDate = new Date(
          session.subscription.created * 1000 +
            (await Plan.findById(subscription.planId)).name === 'weekly'
            ? 7 * 24 * 60 * 60 * 1000
            : subscription.planId.name === 'monthly'
            ? 30 * 24 * 60 * 60 * 1000
            : 365 * 24 * 60 * 60 * 1000
        );
        await subscription.save();
        const transaction = new Transaction({
          userId: subscription.userId,
          subscriptionId: subscription._id,
          stripePaymentId: session.payment_intent || session.id,
          amount: session.amount_total / 100,
          status: 'succeeded',
        });
        await transaction.save();
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = await Subscription.findOne({
        stripeSubscriptionId: event.data.object.id,
      });
      if (subscription) {
        subscription.status = 'canceled';
        subscription.endDate = new Date();
        await subscription.save();
      }
      break;
    }
  }
  res.json({ received: true });
});

module.exports = router;