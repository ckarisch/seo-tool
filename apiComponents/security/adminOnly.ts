import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();

export const adminOnly = async () => {

    const session = await getServerSession(authOptions);

    if (!session || !session!.user) {
        console.log('error: no session')
        return Response.json({ error: 'Not authenticated', domains: [] }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });

    if (!user || user.role !== 'admin') {
        console.log('not allowed');
        return false;
    }

    return true;
}