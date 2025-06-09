const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// User Schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [8, "Password must be at least 8 characters"],
  },
  stripeCustomerId: {
    type: String,
    default: null,
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  this.updatedAt = Date.now();
  next();
});

// Compare password for login
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Subscription Schema
const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plan",
    required: true,
  },
  stripeSubscriptionId: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive", "canceled", "pending"],
    default: "pending",
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Plan Schema
const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Plan name is required"],
    enum: ["weekly", "monthly", "yearly"],
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    min: [0, "Price cannot be negative"],
  },
  fileLimit: {
    type: Number,
    required: [true, "File limit is required"],
    default: 100,
  },
  pageLimit: {
    type: Number,
    required: [true, "Page limit is required"],
    default: 400,
  },
  stripePriceId: {
    type: String,
    required: [true, "Stripe Price ID is required"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subscription",
  },
  stripePaymentId: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: [0, "Amount cannot be negative"],
  },
  status: {
    type: String,
    enum: ["succeeded", "pending", "failed"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);
const Subscription = mongoose.model("Subscription", subscriptionSchema);
const Plan = mongoose.model("Plan", planSchema);
const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = { User, Subscription, Plan, Transaction };
