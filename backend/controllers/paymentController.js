const dotenv = require("dotenv");
dotenv.config(); // Load environment variables from .env file
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_KEY); 

const appearance = { theme: 'flat',
  variables: { colorPrimaryText: '#262626' } };
const baseUrl = process.env.REACT_APP_URL

const createPayment = async (req, res) => {
  const { amount } = req.body;

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Pdf-merger',
          },
          unit_amount: amount * 100,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url:`${baseUrl}/?success=true`,
    cancel_url: `${baseUrl}/cancel`,
  });

  res.status(200).json({ url: session.url });
};

module.exports = {
  createPayment,
};
