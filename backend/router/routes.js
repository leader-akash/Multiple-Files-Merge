const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User, Subscription, Plan, Transaction } = require('../modal/models');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_KEY);
const multer = require('multer');
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const mammoth = require('mammoth');
const libre = require('libreoffice-convert');
// const { authenticateToken } = require('./middleware/auth');


const app = express(); 

// Authentication Middleware
function authenticateToken(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    req.user = null; // No user for unauthenticated requests
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

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

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

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

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
  limits: { fileSize: 10000 * 1024 * 1024 } // 10000MB limit
});

// Multer error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File size limit exceeded ' });
  }
  next(err); // Pass other errors to default error handler
});

// Function to count pages in a PDF file
async function countPdfPages(filePath) {
  const pdfBytes = await fs.readFile(filePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  return pdfDoc.getPageCount();
}

// Function to estimate pages for non-PDF files (simplified heuristic)
async function estimateNonPdfPages(filePath, ext) {
  if (ext === '.docx') {
    const { value: htmlContent } = await mammoth.convertToHtml({ path: filePath });
    // Rough estimate: assume ~500 words per page
    const wordCount = htmlContent.split(/\s+/).length;
    return Math.ceil(wordCount / 500) || 1;
  } else if (ext === '.txt') {
    const content = await fs.readFile(filePath, 'utf-8');
    // Rough estimate: assume ~50 lines per page
    const lineCount = content.split('\n').length;
    return Math.ceil(lineCount / 50) || 1;
  } else if (['.doc', '.rtf', '.ppt', '.pptx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.bmp', '.gif'].includes(ext)) {
    // For images and other non-PDF files, assume 1 page per file
    return 1;
  }
  return 1;
}

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

// Function to convert images to PDF using Puppeteer
async function convertImageToPDF(filePath, outputPath) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Load image in an HTML img tag
  const imagePath = `file://${filePath}`;
  await page.setContent(
    `<div style="display: flex; justify-content: center; align-items: center; height: 100vh;">
       <img src="${imagePath}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
     </div>`,
    { waitUntil: 'networkidle0' }
  );

  // Get image dimensions to set PDF page size
  const dimensions = await page.evaluate(() => {
    const img = document.querySelector('img');
    return { width: img.naturalWidth, height: img.naturalHeight };
  });

  // Set PDF page size to match image dimensions (with A4 constraints)
  const isLandscape = dimensions.width > dimensions.height;
  await page.pdf({
    path: outputPath,
    width: isLandscape ? '842px' : '595px', // A4 landscape or portrait
    height: isLandscape ? '595px' : '842px',
    printBackground: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
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


// Create Subscription
router.post('/subscription', authenticateToken,  async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user.userId;


    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Create Stripe subscription
    const session = await stripe.checkout.sessions.create({
      customer_email: (await User.findById(userId)).email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: 'http://localhost:5173/?success=true',
      cancel_url: 'http://localhost:5173/cancel',
    });

    // Create subscription record (pending)
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
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
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
            session.subscription.created * 1000 + (await Plan.findById(subscription.planId)).name === 'weekly'
              ? 7 * 24 * 60 * 60 * 1000
              : subscription.planId.name === 'monthly'
              ? 30 * 24 * 60 * 60 * 1000
              : 365 * 24 * 60 * 60 * 1000
          );
          await subscription.save();

          // Log transaction
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
  }
);

// Updated Merge Route with Subscription Check

// Updated Merge Route
router.post('/merge', authenticateToken, upload.array('files'), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    let limits = { fileLimit: 3, pageLimit: 400 }; // Default limits for unauthenticated users
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

    // Count total pages
    let totalPages = 0;
    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext === '.pdf') {
        totalPages += await countPdfPages(file.path);
      } else {
        totalPages += await estimateNonPdfPages(file.path, ext);
      }
    }

    // Check limits
    if (files.length > limits.fileLimit) {
      for (const file of files) {
        await fs.unlink(file.path).catch(() => {});
      }
      return res.status(403).json({
        error: `File count ${files.length} exceeds limit of ${limits.fileLimit}. ${
          isSubscribed ? 'Upgrade your plan.' : 'Sign up and purchase a plan for higher limits.'
        }`,
        showPurchase: true,
        requireLogin: !isSubscribed,
      });
    }

    if (totalPages > limits.pageLimit) {
      for (const file of files) {
        await fs.unlink(file.path).catch(() => {});
      }
      return res.status(403).json({
        error: `Total page count ${totalPages} exceeds limit of ${limits.pageLimit}. ${
          isSubscribed ? 'Upgrade your plan.' : 'Sign up and purchase a plan for higher limits.'
        }`,
        showPurchase: true,
        requireLogin: !isSubscribed,
      });
    }

    const pdfPaths = [];
    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const pdfPath = path.join(uploadDir, `${file.filename}.pdf`);

      if (ext === '.pdf') {
        await fs.copyFile(file.path, pdfPath);
      } else if (ext === '.docx') {
        await convertDocxToPDF(file.path, pdfPath);
      } else if (['.doc', '.rtf', '.ppt', '.pptx', '.xls', '.xlsx'].includes(ext)) {
        await convertWithLibreOffice(file.path, pdfPath);
      } else if (ext === '.txt') {
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

module.exports = router;