// app/api/admin/cron/reset/route.ts
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
        return Response.json({ error: "Not authorized" }, { status: 401 });
    }

    try {
        const { id } = await req.json();

        const updatedJob = await prisma.cronJob.update({
            where: { id },
            data: {
                status: 'idle'
            }
        });

        return Response.json({ 
            message: "Cron job status reset successfully",
            job: updatedJob 
        }, { status: 200 });
    } catch (error) {
        console.error('Error resetting cron job:', error);
        return Response.json({ 
            error: "Failed to reset cron job status" 
        }, { status: 500 });
    }
}