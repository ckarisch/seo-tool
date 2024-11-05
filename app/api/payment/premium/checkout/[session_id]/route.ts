import { authOptions } from "@/lib/auth";
import { ErrorResponse, SessionResponse } from "@/app/api/types";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { custom, z } from "zod";
import { getCustomerId } from "./getCustomerId";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-09-30.acacia",
});

// Validate session ID parameter
const sessionIdSchema = z.string().min(1);

const prisma = new PrismaClient();

type StripeAddress = {
  city: string | null;
  country: string | null;
  line1: string | null;
  line2: string | null;
  postal_code: string | null;
  state: string | null;
};

function convertAddress(address: StripeAddress | null): Stripe.AddressParam | undefined {
  if (!address) return undefined;

  return {
    city: address.city || undefined,
    country: address.country || undefined,
    line1: address.line1 || undefined,
    line2: address.line2 || undefined,
    postal_code: address.postal_code || undefined,
    state: address.state || undefined,
  };
}

export async function GET(
  request: Request,
  { params }: { params: { session_id: string } }
): Promise<NextResponse<SessionResponse | ErrorResponse>> {
  const session = await getServerSession(authOptions);

  if (!session || !session!.user) {
    console.log("error: no session");
    throw new Error("Not authenticated");
  }
  const sessionUser = await prisma.user.findFirst({
    where: { email: session.user.email! },
  });

  if (!sessionUser) {
    throw new Error("user not found");
  }

  try {
    // Validate environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not defined");
    }

    // Validate session ID
    const validatedSessionId = sessionIdSchema.parse(params.session_id);

    const checkoutSession = await stripe.checkout.sessions.retrieve(validatedSessionId, {
      expand: ['customer', 'payment_intent', 'payment_intent.latest_charge'] 
    });
    console.log('Checkout Session:', checkoutSession);

    // Validate session data
    if (!checkoutSession) {
      throw new Error("Session not found");
    }

    // Ensure customer_details exists
    if (!checkoutSession.customer_details) {
      throw new Error("Customer details not found");
    }

    const updateData: {
      stripeCustomers?: string[];
      role?: string;
      name?: string;
    } = {};

    // Get customer ID from session or payment intent charge
    let stripeCustomerId: string | null = null;

    if (checkoutSession.mode === 'subscription' && checkoutSession.customer) {
      // For subscriptions, use the session customer
      stripeCustomerId = getCustomerId(checkoutSession.customer);
    } else if (checkoutSession.mode === 'payment' && checkoutSession.payment_intent) {
      const paymentIntent = checkoutSession.payment_intent as Stripe.PaymentIntent;
      
      // Create a new customer for one-time payments
      if (checkoutSession.customer_details?.email) {
        try {
          const customer = await stripe.customers.create({
            email: checkoutSession.customer_details.email,
            name: checkoutSession.customer_details.name || undefined,
            address: convertAddress(checkoutSession.customer_details.address),
            metadata: {
              paymentIntentId: paymentIntent.id,
              checkoutSessionId: checkoutSession.id
            }
          });
          stripeCustomerId = customer.id;
          
          // Attach the payment method to the customer for future use
          if (paymentIntent.payment_method && typeof paymentIntent.payment_method === 'string') {
            await stripe.paymentMethods.attach(paymentIntent.payment_method, {
              customer: customer.id,
            });

            // Set this payment method as the default for the customer
            await stripe.customers.update(customer.id, {
              invoice_settings: {
                default_payment_method: paymentIntent.payment_method
              }
            });
          }
        } catch (error) {
          console.error('Error creating/updating customer:', error);
        }
      }
    }

    if (stripeCustomerId && !sessionUser.stripeCustomers.includes(stripeCustomerId)) {
      console.log(`Adding customer ID ${stripeCustomerId} to user ${sessionUser.email}`);
      updateData.stripeCustomers = [...sessionUser.stripeCustomers, stripeCustomerId];
    }

    // Check if payment is successful
    const isSuccessful = checkoutSession.payment_status === 'paid' && 
      (checkoutSession.status === 'complete' || 
       (checkoutSession.mode === 'payment' && 
        (checkoutSession.payment_intent as Stripe.PaymentIntent)?.status === 'succeeded'));

    // Update role to premium if payment is successful
    if (isSuccessful) {
      console.log('Payment successful - updating user role to premium');
      updateData.role = 'premium';
    }

    // Update name if available from customer details
    if (checkoutSession.customer_details.name) {
      console.log(`Updating user name to: ${checkoutSession.customer_details.name}`);
      updateData.name = checkoutSession.customer_details.name;
    }

    // Only update if we have changes to make
    if (Object.keys(updateData).length > 0) {
      console.log('Updating user with data:', updateData);
      await prisma.user.update({
        where: { id: sessionUser.id },
        data: updateData
      });
    }

    return NextResponse.json({
      status: checkoutSession.status,
      customer_email: checkoutSession.customer_details.email ?? null,
    });
  } catch (err) {
    console.error("Stripe session retrieval error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "An unknown error occurred",
      },
      {
        status:
          err instanceof Stripe.errors.StripeError
            ? err.statusCode
            : err instanceof z.ZodError
            ? 400
            : 500,
      }
    );
  } finally {
    await prisma.$disconnect();
  }
}