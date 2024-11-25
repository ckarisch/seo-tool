import { adminOnly } from '@/apiComponents/security/adminOnly';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  if (!adminOnly()) {
    return Response.json({ error: 'not allowed' }, { status: 503 });
  }

  try {
    const { code, implementation, userRole } = await request.json();

    if (!code) {
      return Response.json(
        { error: 'Missing error code' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (implementation) updateData.implementation = implementation;
    if (userRole) updateData.userRole = userRole;

    if (Object.keys(updateData).length === 0) {
      return Response.json(
        { error: 'No update data provided' },
        { status: 400 }
      );
    }

    const updatedErrorType = await prisma.errorType.update({
      where: { code },
      data: updateData
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