const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middleware/auth');

// Planted Issue: Client-Side Payment Logic Validation
// This route trusts the price parameter sent in the request body 
// instead of fetching the product price securely from the database/backend.
router.post('/checkout', checkAuth, async (req, res) => {
  const { productId, price, quantity } = req.body;

  // VULNERABILITY: An attacker can modify the `price` parameter in the API request
  // (e.g. changing price from 99.00 to 0.01) and pay a fake amount.
  const totalAmount = price * quantity;

  console.log(`Processing payment for product ${productId}: total $${totalAmount}`);

  // In a real app, this would call Stripe SDK with the totalAmount:
  // stripe.paymentIntents.create({ amount: totalAmount * 100, ... })

  res.json({
    success: true,
    message: `Payment intent created for $${totalAmount}`,
    productId,
    totalAmount
  });
});

module.exports = router;
