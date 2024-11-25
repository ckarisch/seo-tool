// lib/auth.ts
import { PrismaClient, UserRole } from '@prisma/client';
import { scryptSync, randomBytes } from 'crypto';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  secret: process.env.SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
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
            name: UserRole.ADMIN,
            role: UserRole.ADMIN // Add role here
          };
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            salt: true,
            role: true
          }
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
            name: user.name,
            role: user.role as UserRole
          };
        }

        throw new Error('Invalid email or password');
      }
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          role: UserRole.STANDARD as UserRole // Default role for GitHub users
        };
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role as UserRole;
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
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    }
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // You can add additional logic here if needed
    },
  },
  debug: process.env.NODE_ENV === 'development',
};