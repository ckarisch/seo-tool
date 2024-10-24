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

const customerIdSchema = z.string().min(1);

// Updated response type to match Stripe's API
interface SubscriptionsResponse {
  subscriptions: Stripe.Subscription[];
  hasMore: boolean;
}

interface ErrorResponse {
  error: string;
}

export async function GET(
  request: Request,
  { params }: { params: { customerId: string } }
): Promise<NextResponse<SubscriptionsResponse | ErrorResponse>> {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not defined");
    }

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

    if (!sessionUser.stripeCustomers.length) {
      throw new Error("no customer found");
    }

    // const customerId = customerIdSchema.parse(params.customerId);
    const customerId = sessionUser.stripeCustomers[0];

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit")) || 10;
    const starting_after = searchParams.get("starting_after") || undefined;

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit,
      starting_after,
      expand: [
        "data.default_payment_method",
        "data.items.data.price",
        "data.items.data.plan",
      ], //, "data.items.data.price.product"],
    });

    console.log(subscriptions.data[0].items.data[0].plan);
    console.log(subscriptions.data[0].items.data[0].price);

    return NextResponse.json({
      subscriptions: subscriptions.data,
      hasMore: subscriptions.has_more,
    });
  } catch (err) {
    console.error("Error fetching subscriptions:", err);

    if (err instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode || 500 }
      );
    }

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid customer ID format" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
