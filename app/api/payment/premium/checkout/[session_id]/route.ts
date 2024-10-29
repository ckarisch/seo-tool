import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
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
      expand: ['customer'] // Expand customer object to get more details
    });
    console.log(checkoutSession);

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

    // Handle Stripe customer ID
    if (checkoutSession.customer) {
      const customerId = getCustomerId(checkoutSession.customer);
      console.log(`stripe customer id ${customerId}`);
      if (customerId && !sessionUser.stripeCustomers.includes(customerId)) {
        console.log(
          `push customer id ${customerId} to user ${sessionUser.email} (${sessionUser.id})`
        );
        updateData.stripeCustomers = [...sessionUser.stripeCustomers, customerId];
      }
    }

    // Update role to premium if payment is successful
    if (checkoutSession.status === 'complete' && checkoutSession.payment_status === 'paid') {
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