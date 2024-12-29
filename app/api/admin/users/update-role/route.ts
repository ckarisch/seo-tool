// app/api/admin/users/update-role/route.ts
import { PrismaClient, UserRole } from "@prisma/client";
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
        const { userId, role } = await req.json();

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role: role as UserRole }
        });

        return Response.json({ 
            message: "User role updated successfully",
            user: updatedUser 
        }, { status: 200 });
    } catch (error) {
        console.error('Error updating user role:', error);
        return Response.json({ 
            error: "Failed to update user role" 
        }, { status: 500 });
    }
}