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

const cancelAllSubscription = async (customerId) => {
  try {
    if (!process.env.STRIPE_KEY)
      throw new Error("Stripe configuration missing.");
    if (!customerId) throw new Error("Customer ID is required.");

    const subscriptions = await Stripe.subscriptions.list({
      customer: customerId,
    });

    if (!subscriptions.data.length) {
      console.log(`ℹ️ No subscriptions found for customer: ${customerId}`);
      return [];
    }

    const cancelPromises = subscriptions.data.map((sub) => {
      return Stripe.subscriptions
        .cancel(sub.id)
        .then((result) => {
          console.log(`✅ Canceled subscription: ${sub.id}`);
          return result;
        })
        .catch((err) => {
          console.error(`❌ Failed to cancel ${sub.id}:`, err.message);
          return null;
        });
    });

    await Promise.all(cancelPromises);
  } catch (error) {
    console.error("🚨 cancelAllSubscription error:", error.message);
    throw error;
  }
};

module.exports = { Stripe, fetchSubscriptionWithId, cancelAllSubscription };
