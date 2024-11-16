// lib/session.ts
import { Session } from "next-auth";
import { UserRole } from "@/types/next-auth";

export function getUserRole(session: Session | null): UserRole {
  return session?.user?.role || 'standard';
}

export function isAdmin(session: Session | null): boolean {
  return getUserRole(session) === 'admin';
}

export function isPremium(session: Session | null): boolean {
  return getUserRole(session) === 'premium';
}

export function hasRequiredRole(session: Session | null, requiredRoles: UserRole[]): boolean {
  const userRole = getUserRole(session);
  return requiredRoles.includes(userRole);
}

export function canAccessFeature(session: Session | null, feature: string): boolean {
  const userRole = getUserRole(session);
  
  // Define feature access rules
  const featureAccess: Record<string, UserRole[]> = {
    'crawls': ['admin'],
    'domain-overview': ['admin', 'premium', 'standard'],
    'performance': ['admin', 'premium', 'standard'],
    'quick-analysis': ['admin', 'premium', 'standard'],
    'errors': ['admin', 'premium', 'standard'],
    'settings': ['admin', 'premium', 'standard'],
    'domain-actions': ['admin'], // Only admins can access domain actions
  };

  const allowedRoles = featureAccess[feature] || ['admin'];
  return allowedRoles.includes(userRole);
}