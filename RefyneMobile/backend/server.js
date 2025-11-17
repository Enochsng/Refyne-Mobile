const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Import routes
const paymentRoutes = require('./routes/payments');
const connectRoutes = require('./routes/connect');
const { router: webhookRoutes } = require('./routes/webhooks');
const conversationRoutes = require('./routes/conversations');
const { clearAllConversations } = require('./services/database');

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting - more lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 500 : 100, // More lenient in development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for health checks
  skip: (req) => {
    return req.path === '/health' || req.path === '/test';
  }
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // In development, allow all origins for easier testing
    if (process.env.NODE_ENV === 'development') {
      callback(null, true);
      return;
    }
    
    // In production, use specific allowed origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:19006',
      'exp://localhost:19000',
      'http://10.0.0.207:19006',
      'exp://10.0.0.207:19000',
      'http://192.168.1.79:19006',
      'exp://192.168.1.79:19000',
      'http://167.160.184.214:19006',
      'exp://167.160.184.214:19000',
      'http://167.160.184.214:3001',
      'https://167.160.184.214:19006',
      'exp://167.160.184.214:19000',
      'https://167.160.184.214:3001'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Payment success page
app.get('/payment-success', (req, res) => {
  const sessionId = req.query.session_id;
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Successful - Refyne Mobile</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #0C295C 0%, #1A4A7A 50%, #2D5A8A 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .container {
                background: white;
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                max-width: 400px;
                width: 100%;
            }
            
            .success-icon {
                width: 80px;
                height: 80px;
                background: #059669;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                font-size: 40px;
                color: white;
            }
            
            h1 {
                color: #0C295C;
                font-size: 28px;
                margin-bottom: 10px;
                font-weight: 700;
            }
            
            p {
                color: #64748B;
                font-size: 16px;
                line-height: 1.5;
                margin-bottom: 30px;
            }
            
            .return-button {
                background: linear-gradient(135deg, #0C295C, #1A4A7A);
                color: white;
                border: none;
                padding: 16px 32px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
                text-decoration: none;
                display: inline-block;
                min-width: 200px;
            }
            
            .return-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(12, 41, 92, 0.3);
            }
            
            .session-info {
                background: #F8FAFF;
                border-radius: 8px;
                padding: 15px;
                margin-top: 20px;
                font-size: 12px;
                color: #64748B;
                word-break: break-all;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="success-icon">✓</div>
            <h1>Payment Successful!</h1>
            <p>Your coaching session has been activated. You can now start uploading your clips and get personalized feedback from your coach.</p>
            <button onclick="returnToApp()" class="return-button">
                Return to App
            </button>
            ${sessionId ? `<div class="session-info">Session ID: ${sessionId}</div>` : ''}
        </div>
        
        <script>
            function returnToApp() {
                // Try to close the browser tab/window (works on mobile)
                try {
                    window.close();
                } catch (e) {
                    console.log('Window close failed:', e);
                }
                
                // If window.close() doesn't work, try to go back
                setTimeout(() => {
                    try {
                        window.history.back();
                    } catch (e) {
                        console.log('History back failed:', e);
                    }
                }, 500);
                
                // If both fail, show instructions
                setTimeout(() => {
                    if (confirm('Your payment was successful! Please return to the Refyne Mobile app manually. Click OK to close this page.')) {
                        try {
                            window.close();
                        } catch (e) {
                            // If we can't close, at least show a success message
                            document.body.innerHTML = '<div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;"><h1 style="color: #059669;">✅ Payment Successful!</h1><p>Please return to the Refyne Mobile app.</p></div>';
                        }
                    }
                }, 2000);
            }
            
            // Auto-redirect after 8 seconds if user doesn't click the button
            setTimeout(() => {
                returnToApp();
            }, 8000);
        </script>
    </body>
    </html>
  `);
});

// Stripe Connect success page
app.get('/coach/earnings', (req, res) => {
  const { success, accountId, refresh } = req.query;
  
  if (success === 'true' && accountId) {
    // Stripe Connect onboarding completed successfully
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Stripe Connected - Refyne Mobile</title>
          <style>
              * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
              }
              
              body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  background: linear-gradient(135deg, #0C295C 0%, #1A4A7A 50%, #2D5A8A 100%);
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  padding: 20px;
              }
              
              .container {
                  background: white;
                  border-radius: 20px;
                  padding: 40px;
                  text-align: center;
                  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                  max-width: 400px;
                  width: 100%;
              }
              
              .success-icon {
                  width: 80px;
                  height: 80px;
                  background: #4CAF50;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto 20px;
                  font-size: 40px;
                  color: white;
              }
              
              h1 {
                  color: #0C295C;
                  font-size: 28px;
                  margin-bottom: 10px;
                  font-weight: 700;
              }
              
              p {
                  color: #64748B;
                  font-size: 16px;
                  line-height: 1.5;
                  margin-bottom: 30px;
              }
              
              .return-button {
                  background: linear-gradient(135deg, #0C295C, #1A4A7A);
                  color: white;
                  border: none;
                  padding: 16px 32px;
                  border-radius: 12px;
                  font-size: 16px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: transform 0.2s, box-shadow 0.2s;
                  text-decoration: none;
                  display: inline-block;
                  min-width: 200px;
              }
              
              .return-button:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 8px 20px rgba(12, 41, 92, 0.3);
              }
              
              .account-info {
                  background: #F8FAFF;
                  border-radius: 8px;
                  padding: 15px;
                  margin-top: 20px;
                  font-size: 12px;
                  color: #64748B;
                  word-break: break-all;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="success-icon">✓</div>
              <h1>Stripe Connected!</h1>
              <p>Your Stripe account has been successfully connected. You can now receive payments for your coaching services.</p>
              <button onclick="returnToApp()" class="return-button">
                  Return to App
              </button>
              <div class="account-info">Account ID: ${accountId}</div>
          </div>
          
          <script>
              function returnToApp() {
                  // Try to close the browser tab/window (works on mobile)
                  try {
                      window.close();
                  } catch (e) {
                      console.log('Window close failed:', e);
                  }
                  
                  // If window.close() doesn't work, try to go back
                  setTimeout(() => {
                      try {
                          window.history.back();
                      } catch (e) {
                          console.log('History back failed:', e);
                      }
                  }, 500);
                  
                  // If both fail, show instructions
                  setTimeout(() => {
                      if (confirm('Your Stripe account is now connected! Please return to the Refyne Mobile app manually. Click OK to close this page.')) {
                          try {
                              window.close();
                          } catch (e) {
                              // If we can't close, at least show a success message
                              document.body.innerHTML = '<div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;"><h1 style="color: #4CAF50;">✅ Stripe Connected!</h1><p>Please return to the Refyne Mobile app.</p></div>';
                          }
                      }
                  }, 2000);
              }
              
              // Auto-redirect after 8 seconds if user doesn't click the button
              setTimeout(() => {
                  returnToApp();
              }, 8000);
          </script>
      </body>
      </html>
    `);
  } else if (refresh === 'true') {
    // User refreshed or returned from a failed attempt
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Continue Setup - Refyne Mobile</title>
          <style>
              * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
              }
              
              body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  background: linear-gradient(135deg, #0C295C 0%, #1A4A7A 50%, #2D5A8A 100%);
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  padding: 20px;
              }
              
              .container {
                  background: white;
                  border-radius: 20px;
                  padding: 40px;
                  text-align: center;
                  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                  max-width: 400px;
                  width: 100%;
              }
              
              .info-icon {
                  width: 80px;
                  height: 80px;
                  background: #FF9800;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto 20px;
                  font-size: 40px;
                  color: white;
              }
              
              h1 {
                  color: #0C295C;
                  font-size: 28px;
                  margin-bottom: 10px;
                  font-weight: 700;
              }
              
              p {
                  color: #64748B;
                  font-size: 16px;
                  line-height: 1.5;
                  margin-bottom: 30px;
              }
              
              .return-button {
                  background: linear-gradient(135deg, #0C295C, #1A4A7A);
                  color: white;
                  border: none;
                  padding: 16px 32px;
                  border-radius: 12px;
                  font-size: 16px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: transform 0.2s, box-shadow 0.2s;
                  text-decoration: none;
                  display: inline-block;
                  min-width: 200px;
              }
              
              .return-button:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 8px 20px rgba(12, 41, 92, 0.3);
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="info-icon">ℹ</div>
              <h1>Continue Setup</h1>
              <p>Please return to the Refyne Mobile app to continue setting up your Stripe account.</p>
              <button onclick="returnToApp()" class="return-button">
                  Return to App
              </button>
          </div>
          
          <script>
              function returnToApp() {
                  // Try to close the browser tab/window (works on mobile)
                  try {
                      window.close();
                  } catch (e) {
                      console.log('Window close failed:', e);
                  }
                  
                  // If window.close() doesn't work, try to go back
                  setTimeout(() => {
                      try {
                          window.history.back();
                      } catch (e) {
                          console.log('History back failed:', e);
                      }
                  }, 500);
                  
                  // If both fail, show instructions
                  setTimeout(() => {
                      if (confirm('Please return to the Refyne Mobile app manually. Click OK to close this page.')) {
                          try {
                              window.close();
                          } catch (e) {
                              // If we can't close, at least show a message
                              document.body.innerHTML = '<div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;"><h1 style="color: #FF9800;">ℹ️ Continue Setup</h1><p>Please return to the Refyne Mobile app.</p></div>';
                          }
                      }
                  }, 2000);
              }
              
              // Auto-redirect after 8 seconds if user doesn't click the button
              setTimeout(() => {
                  returnToApp();
              }, 8000);
          </script>
      </body>
      </html>
    `);
  } else {
    // Default earnings page (shouldn't be accessed directly)
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Earnings - Refyne Mobile</title>
      </head>
      <body>
          <h1>Earnings Page</h1>
          <p>Please access this page through the Refyne Mobile app.</p>
      </body>
      </html>
    `);
  }
});

// Payment cancel page
app.get('/payment-cancel', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Cancelled - Refyne Mobile</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #0C295C 0%, #1A4A7A 50%, #2D5A8A 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .container {
                background: white;
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                max-width: 400px;
                width: 100%;
            }
            
            .cancel-icon {
                width: 80px;
                height: 80px;
                background: #EF4444;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                font-size: 40px;
                color: white;
            }
            
            h1 {
                color: #0C295C;
                font-size: 28px;
                margin-bottom: 10px;
                font-weight: 700;
            }
            
            p {
                color: #64748B;
                font-size: 16px;
                line-height: 1.5;
                margin-bottom: 30px;
            }
            
            .return-button {
                background: linear-gradient(135deg, #0C295C, #1A4A7A);
                color: white;
                border: none;
                padding: 16px 32px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
                text-decoration: none;
                display: inline-block;
                min-width: 200px;
            }
            
            .return-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(12, 41, 92, 0.3);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="cancel-icon">✕</div>
            <h1>Payment Cancelled</h1>
            <p>Your payment was cancelled. You can try again anytime to start your coaching session.</p>
            <button onclick="returnToApp()" class="return-button">
                Return to App
            </button>
        </div>
        
        <script>
            function returnToApp() {
                // Try to close the browser tab/window (works on mobile)
                try {
                    window.close();
                } catch (e) {
                    console.log('Window close failed:', e);
                }
                
                // If window.close() doesn't work, try to go back
                setTimeout(() => {
                    try {
                        window.history.back();
                    } catch (e) {
                        console.log('History back failed:', e);
                    }
                }, 500);
                
                // If both fail, show instructions
                setTimeout(() => {
                    if (confirm('Please return to the Refyne Mobile app manually. Click OK to close this page.')) {
                        try {
                            window.close();
                        } catch (e) {
                            // If we can't close, at least show a message
                            document.body.innerHTML = '<div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;"><h1 style="color: #EF4444;">❌ Payment Cancelled</h1><p>Please return to the Refyne Mobile app.</p></div>';
                        }
                    }
                }, 2000);
            }
            
            // Auto-redirect after 8 seconds if user doesn't click the button
            setTimeout(() => {
                returnToApp();
            }, 8000);
        </script>
    </body>
    </html>
  `);
});

// Test endpoint for payment service
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Backend is working!',
    timestamp: new Date().toISOString(),
    stripeConfigured: !!process.env.STRIPE_SECRET_KEY
  });
});

// Clear all conversations endpoint (for development/testing)
app.post('/api/clear-conversations', (req, res) => {
  try {
    clearAllConversations();
    res.json({ 
      success: true,
      message: 'All conversations cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing conversations:', error);
    res.status(500).json({
      error: 'Failed to clear conversations',
      message: error.message
    });
  }
});

// API routes
app.use('/api/payments', paymentRoutes);
app.use('/api/connect', connectRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/conversations', conversationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.type === 'StripeCardError') {
    return res.status(400).json({
      error: 'Payment failed',
      message: err.message
    });
  }
  
  if (err.type === 'StripeInvalidRequestError') {
    return res.status(400).json({
      error: 'Invalid request',
      message: err.message
    });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Network access: http://167.160.184.214:${PORT}/health`);
});

module.exports = app;
