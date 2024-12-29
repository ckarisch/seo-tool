// app/api/admin/cron/route.ts
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
        return Response.json({ error: "Not authorized" }, { status: 401 });
    }

    try {
        const cronJobs = await prisma.cronJob.findMany({
            orderBy: {
                lastStart: 'desc'
            }
        });

        return Response.json({ cronJobs }, { status: 200 });
    } catch (error) {
        console.error('Error fetching cron jobs:', error);
        return Response.json({ 
            error: "Failed to fetch cron jobs" 
        }, { status: 500 });
    }
}