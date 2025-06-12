const { Subscription, Plan } = require("../modal/models");
const {
  getFileExtension,
  countPdfPages,
  estimateNonPdfPages,
  convertDocxToPDF,
  convertTxtToPDF,
  convertImageToPDF,
  convertWithLibreOffice,
  mergePDFs,
} = require("../services/fileService");

const mergeFiles = async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    let limits = { fileLimit: 3, pageLimit: 400 };
    let isSubscribed = false;

    if (req.user) {
      const subscription = await Subscription.findOne({
        userId: req.user.userId,
        status: "active",
      }).populate("planId");
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
      if (ext === ".pdf") {
        totalPages += await countPdfPages(file.buffer);
      } else {
        totalPages += await estimateNonPdfPages(file.buffer, ext);
      }
    }

    if (files.length > limits.fileLimit) {
      return res.status(403).json({
        error: `File count ${files.length} exceeds limit of ${
          limits.fileLimit
        }. ${
          isSubscribed || req.user
            ? "Upgrade your plan."
            : "Sign up and purchase a plan for higher limits."
        }`,
        showPurchase: true,
        requireLogin: !isSubscribed,
      });
    }
    if (totalPages > limits.pageLimit) {
      return res.status(403).json({
        error: `Total page count ${totalPages} exceeds limit of ${
          limits.pageLimit
        }. ${
          isSubscribed || req.user
            ? "Upgrade your plan."
            : "Sign up and purchase a plan for higher limits."
        }`,
        showPurchase: true,
        requireLogin: !isSubscribed,
      });
    }

    const pdfBuffers = [];
    for (const file of files) {
      const ext = getFileExtension(file);
      try {
        if (ext === ".pdf") {
          pdfBuffers.push(file.buffer);
        } else if (ext === ".docx") {
          pdfBuffers.push(await convertDocxToPDF(file.buffer));
        } else if (
          [".doc", ".rtf", ".ppt", ".pptx", ".xls", ".xlsx"].includes(ext)
        ) {
          pdfBuffers.push(await convertWithLibreOffice(file.buffer, ext));
        } else if (ext === ".txt") {
          pdfBuffers.push(await convertTxtToPDF(file.buffer));
        } else if ([".jpg", ".jpeg", ".png", ".bmp", ".gif"].includes(ext)) {
          pdfBuffers.push(
            await convertImageToPDF(file.buffer, file.originalname)
          );
        } else {
          throw new Error(`Unsupported file type: ${ext || "unknown"}`);
        }
      } catch (error) {
        throw new Error(
          `Conversion failed for ${file.originalname}: ${error.message}`
        );
      }
    }

    const mergedPdfBuffer = await mergePDFs(pdfBuffers);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=merged.pdf",
      "Content-Length": mergedPdfBuffer.length,
    });
    res.send(mergedPdfBuffer);
  } catch (error) {
    res.status(500).json({ error: `Failed to merge files: ${error.message}` });
  }
};

module.exports = { mergeFiles };
