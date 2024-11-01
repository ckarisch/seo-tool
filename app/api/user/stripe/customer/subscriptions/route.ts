// route.ts
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { validateCustomers } from "@/app/api/payment/premium/checkout/validateCustomers";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-09-30.acacia",
});

interface LifetimeLicense {
  id: string;
  created: number;
  amount: number;
  currency: string;
  paymentIntentId: string;
  customerId: string;
}

interface SubscriptionsResponse {
  subscriptions: Stripe.Subscription[];
  hasMore: boolean;
  lifetimeAccess: boolean;
  lifetimeLicenses: LifetimeLicense[];
}

interface ErrorResponse {
  error: string;
}

async function checkLifetimeAccess(customerIds: string[]) {
  const lifetimeLicenses: LifetimeLicense[] = [];
  let hasLifetimeAccess = false;

  for (const customerId of customerIds) {
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
            hasLifetimeAccess = true;
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
          
          hasLifetimeAccess = true;
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

  return {
    hasLifetimeAccess,
    lifetimeLicenses: lifetimeLicenses.sort((a, b) => b.created - a.created)
  };
}

export async function GET(
  request: Request
): Promise<NextResponse<SubscriptionsResponse | ErrorResponse>> {
  try {
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

    // Validate customers first
    const validCustomerIds = await validateCustomers(sessionUser.stripeCustomers);

    // Check lifetime access and get licenses
    const { hasLifetimeAccess, lifetimeLicenses } = await checkLifetimeAccess(
      validCustomerIds
    );

    // Fetch subscriptions first
    const subscriptionsPromises = validCustomerIds.map(async customerId => {
      try {
        // Reduced expand paths
        const subscriptionList = await stripe.subscriptions.list({
          customer: customerId,
          limit: 10,
          expand: ['data.items.data.price'],
        });

        // Fetch product details separately
        const subscriptionsWithProducts = await Promise.all(
          subscriptionList.data.map(async (subscription) => {
            const productId = subscription.items.data[0].price.product as string;
            try {
              const product = await stripe.products.retrieve(productId);
              return {
                ...subscription,
                items: {
                  ...subscription.items,
                  data: subscription.items.data.map(item => ({
                    ...item,
                    price: {
                      ...item.price,
                      product: product
                    }
                  }))
                }
              };
            } catch (error) {
              console.error(`Error fetching product ${productId}:`, error);
              return subscription;
            }
          })
        );

        return {
          data: subscriptionsWithProducts,
          has_more: subscriptionList.has_more
        };
      } catch (error) {
        console.error(`Error checking subscriptions for customer ${customerId}:`, error);
        return { data: [], has_more: false };
      }
    });

    const subscriptionsResponses = await Promise.all(subscriptionsPromises);
    const allSubscriptions = subscriptionsResponses.flatMap(response => response.data);
    
    const sortedSubscriptions = allSubscriptions.sort((a, b) => 
      (b.created || 0) - (a.created || 0)
    );

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit")) || 10;
    const paginatedSubscriptions = sortedSubscriptions.slice(0, limit);
    
    const hasMore = sortedSubscriptions.length > limit || 
      subscriptionsResponses.some(response => response.has_more);

    return NextResponse.json({
      subscriptions: paginatedSubscriptions,
      hasMore,
      lifetimeAccess: hasLifetimeAccess,
      lifetimeLicenses
    });
  } catch (err) {
    console.error("Error fetching subscriptions:", err);
    
    if (err instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 });
    }

    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}