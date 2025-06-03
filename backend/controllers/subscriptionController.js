const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_KEY);
const { User, Subscription, Plan, Transaction } = require('../modal/models');

const baseUrl = process.env.REACT_APP_URL

const createSubscription = async (req, res) => {
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
      success_url: `${baseUrl}/?success=true`,
      cancel_url: `${baseUrl}/cancel`,
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
};

const handleWebhook = async (req, res) => {
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
        subscription.status = 'canceledengel';
        subscription.endDate = new Date();
        await subscription.save();
      }
      break;
    }
  }
  res.json({ received: true });
};

module.exports = { createSubscription, handleWebhook };