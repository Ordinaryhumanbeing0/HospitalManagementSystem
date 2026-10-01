const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { checkAuth } = require('../middleware/auth');

// Planted Issue: Broken Object-Level Authorization (BOLA/IDOR)
// This endpoint loads an order by its ID, but fails to check if the 
// requesting user (req.user.id) actually owns or has permission to view that order.
router.get('/:id', checkAuth, async (req, res) => {
  const orderId = req.params.id;

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // VULNERABILITY: Missing ownership check! 
    // We should verify that data.user_id === req.user.id before returning
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
