// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { scryptSync, randomBytes } from 'crypto';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.string().default('user'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate input data
    const validatedData = signupSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Generate salt and hash password
    const salt = randomBytes(16).toString('hex');
    const passwordHash = scryptSync(validatedData.password, salt, 64);
    const hashedPassword = passwordHash.toString('hex');

    // Create user with required fields
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        password: hashedPassword,
        salt: salt,
        role: validatedData.role,
        // Additional required fields with defaults
        stripeCustomers: [],
        emailVerified: null,
        image: null
      }
    });

    // Remove sensitive data before sending response
    const { password: _, salt: __, ...userWithoutSensitiveData } = user;

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: userWithoutSensitiveData
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    // Handle Prisma errors
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}

// Preflight handler for CORS
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200 });
}