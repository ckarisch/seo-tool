import { adminOnly } from '@/apiComponents/security/adminOnly';
import { prisma } from '@/lib/prisma';

export async function GET() {
  if (!adminOnly()) {
    return Response.json({ error: 'not allowed' }, { status: 503 });
  }

  const errorTypes = await prisma.errorType.findMany({
    orderBy: [
      { category: 'asc' },
      { severity: 'asc' },
      { code: 'asc' }
    ]
  });

  return Response.json({ errorTypes }, { status: 200 });
}
