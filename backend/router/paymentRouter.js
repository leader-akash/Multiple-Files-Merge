const express = require("express");
const { createPayment } = require("../controllers/paymentController");

const router = express.Router();

router.post("/create-payment-intent", createPayment)

module.exports = router;