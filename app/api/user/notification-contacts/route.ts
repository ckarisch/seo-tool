import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, email, type } = body

    if (!name || !email) {
      return new NextResponse(
        JSON.stringify({ error: 'Name and email are required' }),
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return new NextResponse(
        JSON.stringify({ error: 'User not found' }),
        { status: 404 }
      )
    }

    const notificationContact = await prisma.notificationContact.create({
      data: {
        name,
        email,
        type: type || 'email',
        userId: user.id
      }
    })

    return new NextResponse(JSON.stringify(notificationContact))
  } catch (error) {
    console.error('Create notification contact error:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    )
  }
}