// app/api/admin/cron/toggle-active/route.ts
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
        const { id, active } = await req.json();

        const updatedJob = await prisma.cronJob.update({
            where: { id },
            data: {
                acitve: active
            }
        });

        return Response.json({ 
            message: `Cron job ${active ? 'activated' : 'deactivated'} successfully`,
            job: updatedJob 
        }, { status: 200 });
    } catch (error) {
        console.error('Error updating cron job:', error);
        return Response.json({ 
            error: "Failed to update cron job status" 
        }, { status: 500 });
    }
}