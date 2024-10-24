// app/api/user/stripe/customer/invoices/[invoiceId]/route.ts
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-09-30.acacia",
});

export async function GET(
  request: Request,
  { params }: { params: { invoiceId: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
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

    // Get the invoice
    const invoice = await stripe.invoices.retrieve(params.invoiceId, {
      expand: ["subscription", "payment_intent", "payment_intent.payment_method"],
    });

    // Verify the invoice belongs to the customer
    if (!sessionUser.stripeCustomers.includes(invoice.customer as string)) {
      throw new Error("Invoice does not belong to this customer");
    }

    return NextResponse.json(invoice);
  } catch (err) {
    console.error("Error fetching invoice:", err);

    if (err instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode || 500 }
      );
    }

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
      if (err.message === "Invoice does not belong to this customer") {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 403 }
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