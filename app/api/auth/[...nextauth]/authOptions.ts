import { PrismaClient } from '@prisma/client';
import { scryptSync } from 'node:crypto';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from "next-auth/providers/credentials"

const prisma = new PrismaClient();


export const authOptions: NextAuthOptions = {
    secret: process.env.SECRET,
    // Configure one or more authentication providers
    providers: [
      CredentialsProvider({
        // The name to display on the sign in form (e.g. "Sign in with...")
        name: "Credentials",
        credentials: {
          email: { label: "Username", type: "text", placeholder: "jsmith" },
          password: { label: "Password", type: "password" }
        },
        async authorize(credentials, req) {
          if (credentials?.email === undefined || credentials?.password === undefined) {
            return null;
          }
  
          if (process.env.ADMIN_EMAIL === credentials?.email && process.env.ADMIN_PASSWORD === credentials?.password) {
            return { email: 'admin@localhost', name: 'admin', id: '-1' };
          }
  
          const user = await prisma.user.findUnique({ where: { email: credentials?.email } })
  
          if (user?.salt === undefined || user?.password === undefined) {
            return null;
          }
  
          const passwordHash = scryptSync(credentials?.password, user.salt, 64);
          const hex = passwordHash.toString('hex');
  
          if (user && hex) {
            if (user.password === hex) {
              return { email: user.email, name: user.name, id: user.id };
            }
            else {
              return null;
            }
          }
          else {
            return null;
          }
        }
      })
    ],
    pages: {
      // signIn: "/api/auth/signin",
      verifyRequest: '/app'
    },
    debug: process.env.NODE_ENV === 'development',
    session: {
      // Set to jwt in order to CredentialsProvider works properly
      strategy: 'jwt',
    },
  }