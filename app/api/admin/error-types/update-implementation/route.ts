import { adminOnly } from '@/apiComponents/security/adminOnly';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    if (!adminOnly()) {
        return Response.json({ error: 'not allowed' }, { status: 503 });
    }

    try {
        const { code, status } = await request.json();

        if (!code || !status) {
            return Response.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const updatedErrorType = await prisma.errorType.update({
            where: { code },
            data: { implementation: status }
        });

        return Response.json(updatedErrorType, { status: 200 });
    } catch (error) {
        console.error('Failed to update error type:', error);
        return Response.json(
            { error: 'Failed to update error type' },
            { status: 500 }
        );
    }
}