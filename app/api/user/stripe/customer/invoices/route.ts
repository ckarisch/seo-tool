import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { validateCustomers } from "@/app/api/payment/premium/checkout/validateCustomers";
import { ErrorResponse } from "@/app/api/types";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-09-30.acacia",
});

interface TransformedTransaction {
  id: string;
  date: number;
  formatted_date: string;
  amount: number;
  formatted_amount: string;
  currency: string;
  status: string;
  type: 'charge' | 'invoice' | 'checkout';
  description: string;
  metadata: Record<string, string>;
  number?: string;
  invoice_url?: string;  // Changed from receipt_url
  hosted_invoice_url?: string;
  payment_intent?: string;
  customer?: string;
}

interface InvoicesResponse {
  invoices: TransformedTransaction[];
  hasMore: boolean;
}

const formatAmount = (amount: number | null): string => {
  if (amount === null) return '€0,00';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(amount / 100);
};

const formatDate = (timestamp: number): string => {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(timestamp * 1000));
};

const isLifetimeTransaction = (metadata: Record<string, string> | null) => {
  return metadata?.type === 'lifetime' ||
    metadata?.product_id === process.env.LIFETIME_PRODUCT_ID;
};

export async function GET(
  request: Request
): Promise<NextResponse<InvoicesResponse | ErrorResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      throw new Error("Not authenticated");
    }

    const user = await prisma.user.findFirst({
      where: { email: session.user.email },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const validCustomerIds = await validateCustomers(user.stripeCustomers);
    console.log('Valid customers for invoice retrieval:', validCustomerIds);

    const transactions: TransformedTransaction[] = [];

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
          const pi = await stripe.paymentIntents.retrieve(customer.metadata.paymentIntentId, {
            expand: ['invoice']
          });

          if (pi.status === 'succeeded' && isLifetimeTransaction(pi.metadata)) {
            const charges = await stripe.charges.list({
              payment_intent: pi.id,
              limit: 1,
              expand: ['data.invoice']
            });

            if (charges.data[0] && charges.data[0].paid && !charges.data[0].refunded) {
              const charge = charges.data[0];
              const invoice = charge.invoice as Stripe.Invoice | null;

              transactions.push({
                id: charge.id,
                date: charge.created,
                formatted_date: formatDate(charge.created),
                amount: charge.amount,
                formatted_amount: formatAmount(charge.amount),
                currency: charge.currency,
                status: 'paid',
                type: 'charge',
                description: 'Lifetime Access',
                metadata: pi.metadata || {},
                invoice_url: invoice?.hosted_invoice_url || charge.receipt_url || undefined,
                hosted_invoice_url: invoice?.hosted_invoice_url,
                payment_intent: pi.id,
                customer: customerId
              });
            }
          }
        }

        // Check all charges for the customer
        const charges = await stripe.charges.list({
          customer: customerId,
          limit: 100,
          expand: ['data.invoice']
        });

        for (const charge of charges.data) {
          if (charge.paid &&
            !charge.refunded &&
            isLifetimeTransaction(charge.metadata)) {

            // Only add if we haven't already added this transaction
            if (!transactions.some(t => t.id === charge.id)) {
              const invoice = charge.invoice as Stripe.Invoice | null;

              transactions.push({
                id: charge.id,
                date: charge.created,
                formatted_date: formatDate(charge.created),
                amount: charge.amount,
                formatted_amount: formatAmount(charge.amount),
                currency: charge.currency,
                status: 'paid',
                type: 'charge',
                description: 'Lifetime Access',
                metadata: charge.metadata || {},
                invoice_url: invoice?.hosted_invoice_url || charge.receipt_url || undefined,
                hosted_invoice_url: invoice?.hosted_invoice_url,
                payment_intent: charge.payment_intent as string,
                customer: customerId
              });
            }
          }
        }

        // Fetch regular invoices
        const invoices = await stripe.invoices.list({
          customer: customerId,
          limit: 100,
          expand: ['data.payment_intent', 'data.charge']
        });

        transactions.push(...invoices.data.map(invoice => {
          const isLifetime = isLifetimeTransaction(invoice.metadata);
          return {
            id: invoice.id,
            date: invoice.created,
            formatted_date: formatDate(invoice.created),
            amount: invoice.total,
            formatted_amount: formatAmount(invoice.total),
            currency: invoice.currency,
            status: invoice.paid ? 'paid' : invoice.status || 'unknown',
            type: 'invoice',
            description: isLifetime ? 'Lifetime Access' : 'Premium Subscription',
            metadata: invoice.metadata || {},
            number: invoice.number,
            invoice_url: invoice.hosted_invoice_url || undefined,
            hosted_invoice_url: invoice.hosted_invoice_url || undefined,
            payment_intent: typeof invoice.payment_intent === 'string'
              ? invoice.payment_intent
              : invoice.payment_intent?.id,
            customer: invoice.customer as string
          };
        }));

      } catch (error) {
        console.error(`Error fetching data for customer ${customerId}:`, error);
      }
    }

    // Remove any duplicate transactions based on ID
    const uniqueTransactions = Array.from(
      new Map(transactions.map(item => [item.id, item])).values()
    );

    const sortedTransactions = uniqueTransactions.sort((a, b) => b.date - a.date);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 10));
    const paginatedTransactions = sortedTransactions.slice(0, limit);

    return NextResponse.json({
      invoices: paginatedTransactions,
      hasMore: sortedTransactions.length > limit
    });

  } catch (err) {
    console.error("Error fetching invoices:", err);
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}