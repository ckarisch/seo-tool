import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
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

    // Verify the contact belongs to the user
    const contact = await prisma.notificationContact.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    })

    if (!contact) {
      return new NextResponse(
        JSON.stringify({ error: 'Contact not found' }),
        { status: 404 }
      )
    }

    await prisma.notificationContact.delete({
      where: { id: params.id }
    })

    return new NextResponse(
      JSON.stringify({ message: 'Contact deleted successfully' })
    )
  } catch (error) {
    console.error('Delete notification contact error:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    )
  }
}