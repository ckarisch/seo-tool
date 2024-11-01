import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { validateCustomers } from "./validateCustomers";

const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-09-30.acacia',
})

interface CheckoutResponse {
  clientSecret?: string;
  hasPremiumAccess?: boolean;
  accessType?: 'subscription' | 'lifetime' | null;
  subscriptionType?: string | null;
}

interface CheckoutRequest {
  planType: 'subscription' | 'lifetime';
}

interface ErrorResponse {
  error: string
}

function validateEnv(): string {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not defined')
  }
  if (!process.env.NEXT_PUBLIC_FE_DOMAIN) {
    throw new Error('NEXT_PUBLIC_FE_DOMAIN is not defined')
  }
  if (!process.env.PREMIUM_PRICE_ID) {
    throw new Error('PREMIUM_PRICE_ID is not defined')
  }
  if (!process.env.LIFETIME_PRICE_ID) {
    throw new Error('LIFETIME_PRICE_ID is not defined')
  }
  if (!process.env.LIFETIME_PRODUCT_ID) {
    throw new Error('LIFETIME_PRODUCT_ID is not defined')
  }
  if (!process.env.PREMIUM_PRODUCT_ID) {
    throw new Error('PREMIUM_PRODUCT_ID is not defined')
  }
  return process.env.NEXT_PUBLIC_FE_DOMAIN
}

async function checkExistingAccess(customerIds: string[]) {
  console.log('Checking access for customers:', customerIds);
  
  const validCustomerIds = await validateCustomers(customerIds);
  console.log('Valid customers:', validCustomerIds);

  if (validCustomerIds.length === 0) {
    return {
      hasPremiumAccess: false,
      accessType: null,
      subscriptionType: null,
      lifetimeLicenses: []
    };
  }

  // Track all lifetime licenses
  const lifetimeLicenses: LifetimeLicense[] = [];

  // Check for lifetime access through customers and their payment intents
  for (const customerId of validCustomerIds) {
    try {
      // First get customer details to check for payment intents
      const customer = await stripe.customers.retrieve(customerId);
      if ('deleted' in customer) continue;

      console.log('Checking customer:', {
        id: customer.id,
        email: customer.email,
        metadata: customer.metadata
      });

      // Check payment intent if it exists in metadata
      if (customer.metadata?.paymentIntentId) {
        const pi = await stripe.paymentIntents.retrieve(customer.metadata.paymentIntentId);
        
        if (pi.status === 'succeeded' && 
          (pi.metadata.type === 'lifetime' || 
           pi.metadata.product_id === process.env.LIFETIME_PRODUCT_ID)) {
          
          // Get the charge for this payment intent
          const charges = await stripe.charges.list({
            payment_intent: pi.id,
            limit: 1
          });

          if (charges.data[0] && charges.data[0].paid && !charges.data[0].refunded) {
            lifetimeLicenses.push({
              id: charges.data[0].id,
              created: charges.data[0].created,
              amount: charges.data[0].amount,
              currency: charges.data[0].currency,
              paymentIntentId: pi.id,
              customerId: customer.id
            });
          }
        }
      }

      // Also check charges directly
      const charges = await stripe.charges.list({
        customer: customerId,
        limit: 100,
      });

      for (const charge of charges.data) {
        if (charge.paid && 
            !charge.refunded && 
            (charge.metadata.type === 'lifetime' || 
             charge.metadata.product_id === process.env.LIFETIME_PRODUCT_ID)) {
          
          lifetimeLicenses.push({
            id: charge.id,
            created: charge.created,
            amount: charge.amount,
            currency: charge.currency,
            paymentIntentId: charge.payment_intent as string,
            customerId: customer.id
          });
        }
      }
    } catch (error) {
      console.error(`Error checking lifetime access for customer ${customerId}:`, error);
    }
  }

  // Sort lifetime licenses by creation date (newest first)
  const sortedLicenses = lifetimeLicenses.sort((a, b) => b.created - a.created);

  // If we have any valid lifetime licenses, return lifetime access
  if (sortedLicenses.length > 0) {
    return {
      hasPremiumAccess: true,
      accessType: 'lifetime' as const,
      subscriptionType: 'Lifetime',
      lifetimeLicenses: sortedLicenses
    };
  }

  // Check for active subscriptions
  const subscriptionsPromises = validCustomerIds.map(async customerId => {
    try {
      return await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        expand: ['data.items.data.price'],
      });
    } catch (error) {
      console.error(`Error checking subscriptions for customer ${customerId}:`, error);
      return { data: [] };
    }
  });

  const subscriptionsResponses = await Promise.all(subscriptionsPromises);
  const activeSubscriptions = subscriptionsResponses.flatMap(response => response.data);

  console.log('Active subscriptions:', activeSubscriptions.map(sub => ({
    id: sub.id,
    status: sub.status,
    items: sub.items.data.map(item => ({
      priceId: item.price.id,
      productId: item.price.product
    }))
  })));

  // Check for premium subscription
  for (const subscription of activeSubscriptions) {
    if (subscription.status === 'active') {
      const items = subscription.items.data;
      for (const item of items) {
        const productId = item.price.product as string;
        if (productId === process.env.PREMIUM_PRODUCT_ID) {
          console.log('Found active premium subscription:', subscription.id);
          return {
            hasPremiumAccess: true,
            accessType: 'subscription' as const,
            subscriptionType: 'Premium',
            lifetimeLicenses: []
          };
        }
      }
    }
  }

  console.log('No active subscriptions or lifetime access found');
  return {
    hasPremiumAccess: false,
    accessType: null,
    subscriptionType: null,
    lifetimeLicenses: []
  };
}

export async function POST(
  request: Request
): Promise<NextResponse<CheckoutResponse | ErrorResponse>> {
  try {
    const baseUrl = validateEnv()
    const { planType } = await request.json() as CheckoutRequest;

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new Error("Not authenticated");
    }

    const sessionUser = await prisma.user.findFirst({
      where: { email: session.user.email! },
    });

    if (!sessionUser) {
      throw new Error("User not found");
    }

    // Check existing access
    if (sessionUser.stripeCustomers.length) {
      const accessStatus = await checkExistingAccess(sessionUser.stripeCustomers);
      if (accessStatus.hasPremiumAccess) {
        return NextResponse.json({
          hasPremiumAccess: true,
          accessType: accessStatus.accessType,
          subscriptionType: accessStatus.subscriptionType
        });
      }
    }

    // For lifetime purchases, we'll create a one-time invoice
    if (planType === 'lifetime') {
      const checkoutSession = await stripe.checkout.sessions.create({
        ui_mode: 'embedded',
        mode: 'payment',
        line_items: [
          {
            price: process.env.LIFETIME_PRICE_ID,
            quantity: 1,
          },
        ],
        payment_method_types: ['card'],
        return_url: `${baseUrl}/app/get-premium/return?session_id={CHECKOUT_SESSION_ID}`,
        automatic_tax: { enabled: true },
        billing_address_collection: 'required',
        customer_creation: 'always', // Always create a new customer for lifetime purchases
        invoice_creation: {
          enabled: true,
          invoice_data: {
            description: 'Lifetime Access Purchase',
            metadata: {
              type: 'lifetime',
              product_id: process.env.LIFETIME_PRODUCT_ID,
              user_id: sessionUser.id
            },
            custom_fields: [
              {
                name: 'Type',
                value: 'Lifetime Access'
              }
            ],
            rendering_options: {
              amount_tax_display: 'include_inclusive_tax'
            }
          }
        },
        metadata: {
          type: 'lifetime',
          product_id: process.env.LIFETIME_PRODUCT_ID,
          user_id: sessionUser.id,
          user_email: sessionUser.email
        },
        payment_intent_data: {
          metadata: {
            type: 'lifetime',
            product_id: process.env.LIFETIME_PRODUCT_ID,
            user_id: sessionUser.id
          },
          setup_future_usage: 'off_session'
        }
      });

      if (!checkoutSession.client_secret) {
        throw new Error('Failed to create checkout session')
      }

      return NextResponse.json({
        clientSecret: checkoutSession.client_secret,
        hasPremiumAccess: false,
        accessType: null,
        subscriptionType: null
      });
    }

    // For subscription, use the existing flow
    const checkoutSession = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      mode: 'subscription',
      line_items: [
        {
          price: process.env.PREMIUM_PRICE_ID,
          quantity: 1,
        },
      ],
      return_url: `${baseUrl}/app/get-premium/return?session_id={CHECKOUT_SESSION_ID}`,
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      payment_method_types: ['card'],
      metadata: {
        type: 'subscription',
        product_id: process.env.PREMIUM_PRODUCT_ID,
        user_id: sessionUser.id,
        user_email: sessionUser.email
      },
      subscription_data: {
        description: 'Premium Subscription',
        metadata: {
          type: 'subscription',
          product_id: process.env.PREMIUM_PRODUCT_ID,
          user_id: sessionUser.id
        }
      },
      custom_fields: [
        {
          key: 'company_name',
          label: {
            type: 'custom',
            custom: 'Firmenname (optional)',
          },
          type: 'text',
          optional: true,
        },
        {
          key: 'tax_id',
          label: {
            type: 'custom',
            custom: 'USt-IdNr. (optional)',
          },
          type: 'text',
          optional: true,
        }
      ]
    });

    if (!checkoutSession.client_secret) {
      throw new Error('Failed to create checkout session')
    }

    return NextResponse.json({
      clientSecret: checkoutSession.client_secret,
      hasPremiumAccess: false,
      accessType: null,
      subscriptionType: null
    });
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'An unknown error occurred' },
      { status: err instanceof Stripe.errors.StripeError ? err.statusCode : 500 }
    )
  } finally {
    await prisma.$disconnect();
  }
}