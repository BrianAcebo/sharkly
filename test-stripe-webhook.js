// Test Stripe webhook with raw body
const testStripeWebhook = async () => {
  const webhookUrl = 'http://localhost:3000/api/billing/stripe/webhook';
  
  // Test subscription created event with raw body
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
        'Stripe-Signature': 't=1757476223,v1=test_signature' // This will fail signature verification, but we can test the endpoint
      },
      body: JSON.stringify(subscriptionCreatedEvent)
    });

    console.log('Webhook test response:', response.status, await response.text());
  } catch (error) {
    console.error('Webhook test error:', error);
  }
};

// Run test
console.log('Testing Stripe webhook endpoint...');
testStripeWebhook();
