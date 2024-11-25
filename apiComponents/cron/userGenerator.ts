import { env } from "process";
import { createLogger } from "../dev/logger";
import { LogEntry } from "../dev/StreamingLogViewer";
import { CronJob, PrismaClient, UserRole } from "@prisma/client";
import { checkTimeout } from "@/app/api/seo/domains/[domainName]/crawl/crawlLinkHelper";
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-09-30.acacia",
});

const maxUsers = 50;

async function checkUserPremiumAccess(user: { email: string, stripeCustomers: string[] }) {
  // Skip check if user has no Stripe customers
  if (!user.stripeCustomers.length) {
    return false;
  }

  try {
    // Check subscriptions for all customer IDs
    const subscriptionsPromises = user.stripeCustomers.map(async customerId => {
      try {
        return await stripe.subscriptions.list({
          customer: customerId,
          status: 'active',
          expand: ['data.latest_invoice']
        });
      } catch (error) {
        console.log(`Stripe subscription error for customer ${customerId}:`, error);
        return { data: [] };
      }
    });

    const subscriptionsResponses = await Promise.all(subscriptionsPromises);
    const activeSubscriptions = subscriptionsResponses.flatMap(response => response.data);

    // Check if any subscription is active and paid
    const hasActiveSubscription = activeSubscriptions.some(subscription => {
      const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
      return subscription.status === 'active' && latestInvoice && latestInvoice.paid === true;
    });

    if (hasActiveSubscription) {
      return true;
    }

    // Check for lifetime purchases
    const chargesPromises = user.stripeCustomers.map(async customerId => {
      try {
        return await stripe.charges.list({
          customer: customerId,
          limit: 100
        });
      } catch (error) {
        console.log(`Stripe charges error for customer ${customerId}:`, error);
        return { data: [] };
      }
    });

    const chargesResponses = await Promise.all(chargesPromises);
    const allCharges = chargesResponses.flatMap(response => response.data);

    // Check if any charge corresponds to the lifetime product
    const hasLifetimeLicense = allCharges.some(charge =>
      charge.paid === true &&
      charge.metadata.product_id === process.env.LIFETIME_PRODUCT_ID
    );

    return hasLifetimeLicense;

  } catch (error) {
    console.error(`Error checking premium access for user ${user.email}:`, error);
    return false;
  }
}

export async function* userGenerator(
  maxExecutionTime: number,
  host: string,
  cron: CronJob
): AsyncGenerator<LogEntry> {
  const userLogger = createLogger("User");

  const lighthouseStartTime = new Date().getTime();
  let timePassed = new Date().getTime() - lighthouseStartTime;
  let timeLeft = maxExecutionTime - timePassed;
  let usersDowngraded: string[] = [];

  let usersDone = 0;

  if (env.NODE_ENV == "development") {
    yield* userLogger.log(`cron in dev mode`);
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    yield* userLogger.log("Error: STRIPE_SECRET_KEY not defined");
    return;
  }

  if (!process.env.LIFETIME_PRODUCT_ID) {
    yield* userLogger.log("Error: LIFETIME_PRODUCT_ID not defined");
    return;
  }

  yield* userLogger.log("start user premium check");
  const users = await prisma.user.findMany({
    where: {
      role: UserRole.PREMIUM
    }
  });

  for (const user of users) {
    timePassed = new Date().getTime() - lighthouseStartTime;
    timeLeft = maxExecutionTime - timePassed;
    if (checkTimeout(timePassed, maxExecutionTime)) {
      yield* userLogger.log(`timeout`);
      return;
    }
    if (usersDone >= maxUsers) {
      yield* userLogger.log(`stop crawling (checked = ${usersDone})`);
      break;
    }

    yield* userLogger.log(`checking premium status for user ${user.email}`);

    const hasPremiumAccess = await checkUserPremiumAccess(user);

    if (!hasPremiumAccess) {
      yield* userLogger.log(`➝ ${user.email}: no active premium access found - downgrading to standard`);
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: UserRole.STANDARD }
        });
        usersDowngraded.push(user.email);
      } catch (error) {
        yield* userLogger.log(`➝ ${user.email}: error updating role: ${error}`);
      }
    } else {
      yield* userLogger.log(`➝ ${user.email}: premium access confirmed`);
    }

    usersDone += 1;
    yield* userLogger.log(
      `➝ user ${user.email}: end (checked = ${usersDone})`
    );
    continue;
  }

  if (usersDowngraded.length) {
    await prisma.adminLog.create({
      data: {
        createdAt: new Date(),
        message: `users downgraded: ${usersDowngraded.join(', ')}`
      },
    });
  }

  yield* userLogger.log(`finished checking ${usersDone} users`);
}