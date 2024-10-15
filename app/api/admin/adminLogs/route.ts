import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server';
import { adminOnly } from '@/apiComponents/security/adminOnly';

const prisma = new PrismaClient();

export async function GET() {
  if (!adminOnly()){
    return Response.json({ error: 'not allowed' }, { status: 503 });
  }

  let adminLogs = await prisma.adminLog.findMany({orderBy: {createdAt: 'desc'}});
  
  return Response.json({ adminLogs }, { status: 200 })
}