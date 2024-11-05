// app/api/auth/[...nextauth]/auth.ts
import { PrismaClient } from '@prisma/client';
import { scryptSync, randomBytes } from 'crypto';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  secret: process.env.SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter both email and password');
        }

        // Admin check
        if (process.env.ADMIN_EMAIL === credentials.email && 
            process.env.ADMIN_PASSWORD === credentials.password) {
          return { 
            id: '-1',
            email: 'admin@localhost', 
            name: 'admin'
          };
        }

        const user = await prisma.user.findUnique({ 
          where: { email: credentials.email } 
        });

        if (!user?.salt || !user?.password) {
          throw new Error('Invalid email or password');
        }

        const passwordHash = scryptSync(credentials.password, user.salt, 64);
        const hashedPassword = passwordHash.toString('hex');

        if (user.password === hashedPassword) {
          return { 
            id: user.id,
            email: user.email, 
            name: user.name 
          };
        }

        throw new Error('Invalid email or password');
      }
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      return baseUrl;
    }
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    newUser: '/app/onboarding'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === 'development',
};