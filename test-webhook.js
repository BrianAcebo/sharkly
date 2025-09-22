// Simple test script to verify webhook functionality
// Run with: node test-webhook.js

const testWebhook = async () => {
  const webhookUrl = 'http://localhost:3001/api/billing/stripe/webhook';
  
  // Test subscription created event
  const subscriptionCreatedEvent = {
    id: 'evt_test_webhook',
    object: 'event',
    type: 'customer.subscription.created',
    livemode: false,
    data: {
      object: {
        id: 'sub_test_123',
        object: 'subscription',
        customer: 'cus_test_123',
        status: 'trialing',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
        trial_end: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
        cancel_at_period_end: false
      }
    }
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'test_signature' // This will fail signature verification, but we can test the endpoint
      },
      body: JSON.stringify(subscriptionCreatedEvent)
    });

    console.log('Webhook test response:', response.status, await response.text());
  } catch (error) {
    console.error('Webhook test error:', error);
  }
};

// Test invoice upcoming event
const testInvoiceUpcoming = async () => {
  const webhookUrl = 'http://localhost:3001/api/billing/stripe/webhook';
  
  const invoiceUpcomingEvent = {
    id: 'evt_test_invoice_upcoming',
    object: 'event',
    type: 'invoice.upcoming',
    livemode: false,
    data: {
      object: {
        id: 'in_test_123',
        object: 'invoice',
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
        amount_due: 11900, // $119.00
        currency: 'usd'
      }
    }
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'test_signature'
      },
      body: JSON.stringify(invoiceUpcomingEvent)
    });

    console.log('Invoice upcoming test response:', response.status, await response.text());
  } catch (error) {
    console.error('Invoice upcoming test error:', error);
  }
};

// Run tests
console.log('Testing webhook endpoints...');
testWebhook();
testInvoiceUpcoming();
