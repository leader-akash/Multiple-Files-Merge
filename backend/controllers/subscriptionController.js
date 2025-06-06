const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_KEY);
const { User, Subscription, Plan, Transaction } = require('../modal/models');

const baseUrl = process.env.REACT_APP_URL

const createSubscription = async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    const plan = await Plan.findById(planId);

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    let stripeCustomerId = user.stripeCustomerId;

    // If user doesn't have a Stripe customer ID, create one
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
      });
      stripeCustomerId = customer.id;
      user.stripeCustomerId = customer.id;
      await user.save(); // Save Stripe customer ID to user
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${baseUrl}/?success=true`,
      cancel_url: `${baseUrl}/cancel`,
    });

    const subscription = new Subscription({
      userId,
      planId,
      stripeSubscriptionId: session.id, // temporary; updated in webhook
      status: 'pending',
      startDate: new Date(),
    });
    await subscription.save();

    res.json({ url: session.url });
  } catch (error) {
    // console.error(error);
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

      const subscriptionId = session.subscription;
      const stripeCustomerId = session.customer;

      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      const planPriceId = stripeSubscription.items.data[0].price.id;

      const user = await User.findOne({ stripeCustomerId });

      if (!user) return;

      const plan = await Plan.findOne({ stripePriceId: planPriceId });
      if (!plan) return;

      const subscription = await Subscription.findOne({ userId: user._id, status: 'pending' });
      if (!subscription) return;

      const currentDate = new Date();
      let duration;

      switch (plan.name) {
        case 'weekly':
          duration = 7;
          break;
        case 'monthly':
          duration = 30;
          break;
        case 'yearly':
          duration = 365;
          break;
        default:
          duration = 30;
      }

      subscription.status = 'active';
      subscription.stripeSubscriptionId = subscriptionId;
      subscription.startDate = currentDate;
      subscription.endDate = new Date(currentDate.getTime() + duration * 24 * 60 * 60 * 1000);
      await subscription.save();

      const transaction = new Transaction({
        userId: user._id,
        subscriptionId: subscription._id,
        stripePaymentId: session.payment_intent || session.id,
        amount: session.amount_total / 100,
        status: 'succeeded',
      });
      await transaction.save();

      break;
    }

    case 'customer.subscription.deleted': {
      const stripeSubscriptionId = event.data.object.id;
      const subscription = await Subscription.findOne({ stripeSubscriptionId });
      if (subscription) {
        subscription.status = 'canceled';
        subscription.endDate = new Date();
        await subscription.save();
      }
      break;
    }
  }

  res.json({ received: true });
};


module.exports = { createSubscription, handleWebhook };