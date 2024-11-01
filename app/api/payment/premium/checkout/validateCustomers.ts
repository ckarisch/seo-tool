import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-09-30.acacia',
})

export async function validateCustomers(customerIds: string[]): Promise<string[]> {
  const validCustomers: string[] = [];

  for (const customerId of customerIds) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && !('deleted' in customer)) {
        validCustomers.push(customerId);
      } else {
        console.log(`Skipping deleted or invalid customer: ${customerId}`);
      }
    } catch (error) {
      console.log(`Skipping invalid customer ${customerId}:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  return validCustomers;
}