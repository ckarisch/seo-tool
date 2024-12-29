// app/api/admin/users/[id]/route.ts
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
        return Response.json({ error: "Not authorized" }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: {
                id: params.id
            },
            include: {
                domains: true,
                _count: {
                    select: {
                        domains: true,
                        activities: true
                    }
                }
            }
        });

        if (!user) {
            return Response.json({ error: "User not found" }, { status: 404 });
        }

        return Response.json({ user }, { status: 200 });
    } catch (error) {
        console.error('Error fetching user details:', error);
        return Response.json({ 
            error: "Failed to fetch user details" 
        }, { status: 500 });
    }
}