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
  invoice_url?: string;
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

const nullToUndefined = <T>(value: T | null): T | undefined => {
  return value === null ? undefined : value;
};

const getBestUrl = (invoice: Stripe.Invoice | null, charge: Stripe.Charge): string | undefined => {
  if (invoice?.hosted_invoice_url) {
    return invoice.hosted_invoice_url;
  }
  return nullToUndefined(charge.receipt_url);
};

const isLifetimeTransaction = (metadata: Stripe.Metadata | null) => {
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
        // Get customer details
        const customer = await stripe.customers.retrieve(customerId);
        if ('deleted' in customer) continue;

        console.log('Processing customer:', {
          id: customer.id,
          email: customer.email,
          metadata: customer.metadata
        });

        // Check for lifetime purchases in payment intents from customer metadata
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
              const url = getBestUrl(invoice, charge);
              
              const transaction: TransformedTransaction = {
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
                invoice_url: url,
                hosted_invoice_url: nullToUndefined(invoice?.hosted_invoice_url),
                payment_intent: pi.id,
                customer: customerId
              };
              
              transactions.push(transaction);
            }
          }
        }

        // Check all charges
        const charges = await stripe.charges.list({
          customer: customerId,
          limit: 100,
          expand: ['data.invoice']
        });

        for (const charge of charges.data) {
          if (charge.paid && 
              !charge.refunded && 
              isLifetimeTransaction(charge.metadata)) {
            
            if (!transactions.some(t => t.id === charge.id)) {
              const invoice = charge.invoice as Stripe.Invoice | null;
              const url = getBestUrl(invoice, charge);
              
              const transaction: TransformedTransaction = {
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
                invoice_url: url,
                hosted_invoice_url: nullToUndefined(invoice?.hosted_invoice_url),
                payment_intent: charge.payment_intent as string,
                customer: customerId
              };
              
              transactions.push(transaction);
            }
          }
        }

        // Fetch invoices
        const invoices = await stripe.invoices.list({
          customer: customerId,
          limit: 100,
          expand: ['data.payment_intent', 'data.charge']
        });

        const invoiceTransactions: TransformedTransaction[] = invoices.data.map(invoice => {
          const isLifetime = isLifetimeTransaction(invoice.metadata);
          return {
            id: invoice.id,
            date: invoice.created,
            formatted_date: formatDate(invoice.created),
            amount: invoice.total,
            formatted_amount: formatAmount(invoice.total),
            currency: invoice.currency,
            status: invoice.paid ? 'paid' : invoice.status || 'unknown',
            type: 'invoice' as const,
            description: isLifetime ? 'Lifetime Access' : 'Premium Subscription',
            metadata: invoice.metadata || {},
            number: nullToUndefined(invoice.number),
            invoice_url: nullToUndefined(invoice.hosted_invoice_url),
            hosted_invoice_url: nullToUndefined(invoice.hosted_invoice_url),
            payment_intent: typeof invoice.payment_intent === 'string'
              ? invoice.payment_intent
              : invoice.payment_intent?.id,
            customer: invoice.customer as string
          };
        });

        transactions.push(...invoiceTransactions);

      } catch (error) {
        console.error(`Error fetching data for customer ${customerId}:`, error);
      }
    }

    // Remove duplicates and sort
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