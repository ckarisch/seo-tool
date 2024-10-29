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

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      console.log("error: no session");
      throw new Error("Not authenticated");
    }

    const sessionUser = await prisma.user.findFirst({
      where: { email: session.user.email! },
    });

    if (!sessionUser) {
      throw new Error("User not found");
    }

    if (!sessionUser.stripeCustomers.length) {
      throw new Error("No customer found");
    }

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit")) || 10;
    const starting_after = searchParams.get("starting_after") || undefined;

    // Fetch invoices for all customers with error handling
    const invoicesPromises = sessionUser.stripeCustomers.map(async customerId => {
      try {
        return await stripe.invoices.list({
          customer: customerId,
          limit,
          starting_after,
          expand: [
            "data.subscription",
            "data.payment_intent",
            "data.payment_intent.payment_method"
          ],
        });
      } catch (error) {
        if (error instanceof Stripe.errors.StripeError) {
          console.log(`Stripe error for customer ${customerId}:`, error.message);
        } else {
          console.error(`Unknown error for customer ${customerId}:`, error);
        }
        // Return empty invoice list for failed requests
        return { data: [], has_more: false };
      }
    });

    const invoicesResponses = await Promise.all(invoicesPromises);

    // Combine all invoices
    const allInvoices = invoicesResponses.flatMap(response => response.data);
    
    // Sort invoices by created date (newest first)
    const sortedInvoices = allInvoices.sort((a, b) => 
      (b.created || 0) - (a.created || 0)
    );

    // Apply pagination to combined results
    const paginatedInvoices = sortedInvoices.slice(0, limit);
    
    // Check if there are more invoices
    const hasMore = sortedInvoices.length > limit || 
      invoicesResponses.some(response => response.has_more);

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