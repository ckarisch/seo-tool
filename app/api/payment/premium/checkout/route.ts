// app/api/checkout/route.ts
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

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
  if (!process.env.LIFETIME_PRODUCT_ID) {
    throw new Error('LIFETIME_PRODUCT_ID is not defined')
  }
  if (!process.env.PREMIUM_PRODUCT_ID) {
    throw new Error('PREMIUM_PRODUCT_ID is not defined')
  }
  return process.env.NEXT_PUBLIC_FE_DOMAIN
}

async function checkExistingAccess(customerIds: string[]) {
  // Check all subscriptions for all customer IDs
  const subscriptionsPromises = customerIds.map(customerId =>
    stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      expand: ['data.latest_invoice', 'data.items.data.price'],
    })
  );

  const subscriptionsResponses = await Promise.all(subscriptionsPromises);
  const activeSubscriptions = subscriptionsResponses.flatMap(response => response.data);

  // Fetch products for active subscriptions
  const productIds = new Set<string>();
  activeSubscriptions.forEach(subscription => {
    subscription.items.data.forEach(item => {
      if (item.price.product && typeof item.price.product === 'string') {
        productIds.add(item.price.product);
      }
    });
  });

  const products = productIds.size > 0 
    ? await stripe.products.list({ ids: Array.from(productIds) })
    : { data: [] };

  // Create a map of product IDs to products for easy lookup
  const productMap = new Map(
    products.data.map(product => [product.id, product])
  );

  // Check if any subscription is active, paid, and matches the premium product
  const premiumSubscription = activeSubscriptions.find(subscription => {
    const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
    const items = subscription.items.data;
    
    // Check if any item in the subscription matches the premium product
    const hasPremiumProduct = items.some(item => {
      const productId = typeof item.price.product === 'string' 
        ? item.price.product 
        : (item.price.product as Stripe.Product).id;

      return productId === process.env.PREMIUM_PRODUCT_ID &&
             subscription.status === 'active' && 
             latestInvoice && 
             latestInvoice.paid === true;
    });

    return hasPremiumProduct;
  });

  if (premiumSubscription) {
    // Get the product information from our map
    const productId = premiumSubscription.items.data[0].price.product as string;
    const product = productMap.get(productId);
    
    return { 
      hasPremiumAccess: true, 
      accessType: 'subscription' as const,
      subscriptionType: product?.name || 'Premium'
    };
  }

  // Check for lifetime access purchases
  const chargesPromises = customerIds.map(customerId =>
    stripe.charges.list({
      customer: customerId,
      limit: 100,
    })
  );

  const chargesResponses = await Promise.all(chargesPromises);
  const allCharges = chargesResponses.flatMap(response => response.data);

  // Check if any charge corresponds to the lifetime product
  const lifetimeCharge = allCharges.find(charge => 
    charge.paid === true && 
    charge.metadata.product_id === process.env.LIFETIME_PRODUCT_ID
  );

  if (lifetimeCharge) {
    return { 
      hasPremiumAccess: true, 
      accessType: 'lifetime' as const,
      subscriptionType: 'Lifetime'
    };
  }

  return { 
    hasPremiumAccess: false, 
    accessType: null,
    subscriptionType: null 
  };
}

export async function POST(): Promise<NextResponse<CheckoutResponse | ErrorResponse>> {
  try {
    const baseUrl = validateEnv()

    // Get user from session
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      throw new Error("Not authenticated");
    }

    // Get user from database
    const sessionUser = await prisma.user.findFirst({
      where: { email: session.user.email! },
    });

    if (!sessionUser) {
      throw new Error("User not found");
    }

    // Check existing access if user has Stripe customers
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

    // If no premium access, create checkout session
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
      payment_method_types: [
        'card',
      ],
      subscription_data: {
        description: 'Premium Subscription'
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
    } as Stripe.Checkout.SessionCreateParams)

    if (!checkoutSession.client_secret) {
      throw new Error('Failed to create checkout session')
    }

    return NextResponse.json({ 
      clientSecret: checkoutSession.client_secret,
      hasPremiumAccess: false,
      accessType: null,
      subscriptionType: null
    })
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