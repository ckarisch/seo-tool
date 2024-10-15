import { adminOnly } from '@/apiComponents/security/adminOnly';
import { scryptSync } from 'crypto';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  if (!adminOnly()){
    return Response.json({ error: 'not allowed' }, { status: 503 });
  }

  try {
    const { password, salt } = await request.json();

    if (!password || !salt) {
      return NextResponse.json(
        { error: 'Password and salt are required' },
        { status: 400 }
      );
    }

    // Generate the hash using scryptSync
    const derivedKey = scryptSync(password, salt, 64);
    const hash = derivedKey.toString('hex');

    return NextResponse.json({ hash });
  } catch (err) {
    // Use a type guard to check if the error is an instance of Error
    if (err instanceof Error) {
      return NextResponse.json(
        { error: 'Error generating hash', details: err.message },
        { status: 500 }
      );
    }

    // Handle unknown error types
    return NextResponse.json(
      { error: 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
