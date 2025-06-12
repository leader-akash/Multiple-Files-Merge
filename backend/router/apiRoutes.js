const express = require("express");
const router = express.Router();
const multer = require("multer");
const { authenticateToken } = require("../middleware/authMiddleware");
const { signup, login } = require("../controllers/authController");
const { getPlans } = require("../controllers/planController");
const { mergeFiles } = require("../controllers/mergeController");
const {
  createSubscription,
  handleWebhook,
  customerSubscriptionStatus,
} = require("../controllers/subscriptionController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10000 * 1024 * 1024 }, // 10000MB limit
});

router.post("/signup", signup);
router.post("/login", login);
router.get("/plans", getPlans);
router.post("/merge", authenticateToken, upload.array("files"), mergeFiles);
router.post("/subscription", authenticateToken, createSubscription);
router.get(
  "/subscription/:userId/status",
  authenticateToken,
  customerSubscriptionStatus
);
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

module.exports = router;
