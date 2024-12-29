// app/api/admin/users/route.ts
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
        const users = await prisma.user.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                _count: {
                    select: {
                        domains: true
                    }
                }
            }
        });

        return Response.json({ users }, { status: 200 });
    } catch (error) {
        console.error('Error fetching users:', error);
        return Response.json({ 
            error: "Failed to fetch users" 
        }, { status: 500 });
    }
}