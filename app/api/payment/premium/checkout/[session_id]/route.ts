// app/api/checkout/[session_id]/route.ts
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

    const session = await stripe.checkout.sessions.retrieve(validatedSessionId);
    console.log(session);

    // Validate session data
    if (!session) {
      throw new Error("Session not found");
    }

    // Ensure customer_details exists
    if (!session.customer_details) {
      throw new Error("Customer details not found");
    }

    // update db user
    if (session.customer) {
      const customerId = getCustomerId(session.customer);
      console.log(`stripe customer id ${customerId}`);
      if (customerId && !sessionUser.stripeCustomers.includes(customerId)) {
        console.log(
          `push customer id ${customerId} to user ${sessionUser.email} (${sessionUser.id})`
        );
        await prisma.user.update({
          where: { id: sessionUser.id },
          data: { stripeCustomers: { push: customerId } },
        });
      }
    }

    return NextResponse.json({
      status: session.status,
      customer_email: session.customer_details.email ?? null,
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
  }
}
