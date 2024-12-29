// app/api/admin/reset-links/route.ts
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

    const databaseUrl = process.env.DATABASE_URL || '';
    const isTestMode = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    
    if (!isTestMode || databaseUrl.includes('production')) {
        return Response.json(
            { error: "This action is only available in test mode" }, 
            { status: 403 }
        );
    }

    try {
        await prisma.internalLink.deleteMany({});
        await prisma.externalLink.deleteMany({});

        return Response.json({ 
            message: "All links have been removed successfully" 
        }, { status: 200 });
    } catch (error) {
        console.error('Error removing links:', error);
        return Response.json({ 
            error: "Failed to remove links" 
        }, { status: 500 });
    }
}