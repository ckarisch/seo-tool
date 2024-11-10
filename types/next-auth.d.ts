// types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth"
import { JWT } from "next-auth/jwt"

export type UserRole = 'admin' | 'premium' | 'standard'

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    id: string;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}