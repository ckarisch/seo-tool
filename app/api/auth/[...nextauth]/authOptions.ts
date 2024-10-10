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
            return { email: 'admin@formundzeichen.at', name: 'admin', id: '-1' };
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
  //   callbacks: {
  //     async jwt({ token, account }) {
  //         if (account) {
  //             token.accessToken = account.access_token;
  //             token.accessTokenExpire = account.expires_at
  //                 ? account.expires_at * 1000
  //                 : 0;
  //             token.refreshToken = account?.refresh_token;
  //             token.id_token = account?.id_token;
  //             token.accessTokenIssuedAt = Date.now();
  //         }
  //             return token;
  //     },
  //     // eslint-disable-next-line require-await
  //     async session({ session, user, token }) {
  //         if (token && typeof token.accessTokenExpire === 'number' && typeof token.accessTokenIssuedAt === 'number') {
  //             const tempsession: any = session;
  //             // session interval in seconds, It's accesstoken expire - 10 minutes
  //             let interval = Math.round(((token.accessTokenExpire - token.accessTokenIssuedAt) - (60000 * 10)) / 1000);
  //             if (interval < 300) {
  //                 interval = 2
  //             }
  //             tempsession.interval = interval;
  //             return tempsession;
  //         } else {
  //             return session;
  //         }
  //     },
  // },
    // callbacks: {
    //   async session ({ session, token, user }) {
    //     const sanitizedToken = Object.keys(token).reduce((p, c) => {
    //       // strip unnecessary properties
    //       if (
    //         c !== "iat" &&
    //         c !== "exp" &&
    //         c !== "jti" &&
    //         c !== "apiToken"
    //       ) {
    //         return { ...p, [c]: token[c] }
    //       } else {
    //         return p
    //       }
    //     }, {})
    //     return { ...session, user: sanitizedToken, apiToken: token.apiToken }
    //   },
    //   async jwt ({ token, user, account, profile }) {
    //     if (typeof user !== "undefined") {
    //       // user has just signed in so the user object is populated
    //       return user as unknown as JWT
    //     }
    //     return token
    //   }
    // }
  }