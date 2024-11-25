// lib/session.ts
import { Session } from "next-auth";
import { UserRole } from "@prisma/client";

export function getUserRole(session: Session | null): UserRole {
  return session?.user?.role || UserRole.STANDARD;
}

export function isAdmin(session: Session | null): boolean {
  return getUserRole(session) === UserRole.ADMIN;
}

export function isPremium(session: Session | null): boolean {
  return getUserRole(session) === UserRole.PREMIUM;
}

export function hasRequiredRole(session: Session | null, requiredRoles: UserRole[]): boolean {
  const userRole = getUserRole(session);
  return requiredRoles.includes(userRole);
}

export function canAccessFeature(session: Session | null, feature: string): boolean {
  const userRole = getUserRole(session);

  // Define feature access rules
  const featureAccess: Record<string, UserRole[]> = {
    'crawls': [UserRole.ADMIN],
    'domain-overview': [UserRole.ADMIN, UserRole.PREMIUM, UserRole.STANDARD],
    'performance': [UserRole.ADMIN],
    'quick-analysis': [UserRole.ADMIN],
    'errors': [UserRole.ADMIN, UserRole.PREMIUM, UserRole.STANDARD],
    'settings': [UserRole.ADMIN, UserRole.PREMIUM, UserRole.STANDARD],
    'domain-actions': [UserRole.ADMIN], // Only admins can access domain actions
  };

  const allowedRoles = featureAccess[feature] || [UserRole.ADMIN];
  return allowedRoles.includes(userRole);
}