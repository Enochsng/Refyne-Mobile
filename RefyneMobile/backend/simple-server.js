const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Backend server is running'
  });
});

// Mock payment intent creation (for testing)
app.post('/api/payments/create-intent', (req, res) => {
  console.log('Payment intent request:', req.body);
  
  // Mock response
  const mockPaymentIntent = {
    id: `pi_mock_${Date.now()}`,
    client_secret: `pi_mock_${Date.now()}_secret_mock`,
    amount: 4000, // $40 in cents
    currency: 'cad',
    status: 'requires_payment_method',
  };
  
  res.json({
    success: true,
    paymentIntent: mockPaymentIntent
  });
});

// Mock payment confirmation
app.post('/api/payments/confirm', (req, res) => {
  console.log('Payment confirmation request:', req.body);
  
  const mockSession = {
    id: `session_${Date.now()}`,
    status: 'active',
    createdAt: new Date().toISOString(),
    clipsUploaded: 0,
    messages: []
  };
  
  res.json({
    success: true,
    session: mockSession,
    message: 'Payment confirmed and coaching session created'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple server running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
  console.log(`💳 Payment endpoint: http://localhost:${PORT}/api/payments/create-intent`);
});

module.exports = app;
