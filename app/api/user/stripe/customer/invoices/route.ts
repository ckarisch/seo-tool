import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-09-30.acacia",
});

interface InvoicesResponse {
  invoices: Stripe.Invoice[];
  hasMore: boolean;
}

interface ErrorResponse {
  error: string;
}

export async function GET(
  request: Request
): Promise<NextResponse<InvoicesResponse | ErrorResponse>> {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not defined");
    }

    // Get user from session
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      console.log("error: no session");
      throw new Error("Not authenticated");
    }

    // Get user from database
    const sessionUser = await prisma.user.findFirst({
      where: { email: session.user.email! },
    });

    if (!sessionUser) {
      throw new Error("User not found");
    }

    if (!sessionUser.stripeCustomers.length) {
      throw new Error("No customer found");
    }

    // Get pagination parameters
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit")) || 10;
    const starting_after = searchParams.get("starting_after") || undefined;

    // Fetch invoices for all customers
    const allInvoicesPromises = sessionUser.stripeCustomers.map((customerId) =>
      stripe.invoices.list({
        customer: customerId,
        limit,
        starting_after,
        expand: [
          "data.subscription",
          "data.payment_intent",
          "data.payment_intent.payment_method"
        ],
      })
    );

    const allInvoicesResponses = await Promise.all(allInvoicesPromises);

    // Combine all invoices
    const combinedInvoices = allInvoicesResponses.reduce<Stripe.Invoice[]>(
      (acc, response) => [...acc, ...response.data],
      []
    );

    // Sort combined invoices by date (newest first)
    const sortedInvoices = combinedInvoices.sort((a, b) => 
      (b.created || 0) - (a.created || 0)
    );

    // Apply pagination to combined results
    const paginatedInvoices = sortedInvoices.slice(0, limit);
    
    // Check if there are more invoices
    const hasMore = sortedInvoices.length > limit || 
      allInvoicesResponses.some(response => response.has_more);

    return NextResponse.json({
      invoices: paginatedInvoices,
      hasMore,
    });
  } catch (err) {
    console.error("Error fetching invoices:", err);

    if (err instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode || 500 }
      );
    }

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid format" },
        { status: 400 }
      );
    }

    // Handle specific error messages
    if (err instanceof Error) {
      if (err.message === "Not authenticated") {
        return NextResponse.json(
          { error: "Not authenticated" },
          { status: 401 }
        );
      }
      if (err.message === "User not found") {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      if (err.message === "No customer found") {
        return NextResponse.json(
          { error: "No Stripe customer found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}