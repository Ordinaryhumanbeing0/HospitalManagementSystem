const express = require('express');
const ordersRouter = require('./routes/orders');
const paymentsRouter = require('./routes/payments');

const app = express();
app.use(express.json());

// Main App API routes
app.use('/api/orders', ordersRouter);
app.use('/api/payments', paymentsRouter);

// Home route
app.get('/', (req, res) => {
  res.send('Welcome to the Vulnerable Demo App. Run checkmyvibe to find security flaws.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Vulnerable app running on port ${PORT}`);
});
