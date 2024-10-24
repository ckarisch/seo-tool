import Stripe from "stripe";

export const getCustomerId = (customer: Stripe.Checkout.Session['customer']): string | null => {
    if (customer === null) return null;
    if (typeof customer === 'string') return customer;
    if ('id' in customer) return customer.id;
    return null;
  };