const stripe = require("stripe");
const Stripe = stripe(process.env.STRIPE_KEY);

const fetchSubscriptionWithId = async (customerId) => {
  try {
    if (!process.env.STRIPE_KEY) {
      throw new Error("Stripe configuration is missing.");
    }

    if (!customerId) {
      throw new Error("Customer ID is required.");
    }

    const subscriptions = await Stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
    });

    if (!subscriptions?.data?.length) {
      console.log("No subscriptions found for customer:", customerId);
      return null;
    }

    const subscription = subscriptions.data[0];
    console.log("✅ Subscription fetched:", subscription);

    return subscription;
  } catch (error) {
    console.error("❌ Error fetching subscription:", error.message);
    throw new Error("Failed to fetch subscription details.");
  }
};

module.exports = { Stripe, fetchSubscriptionWithId };
