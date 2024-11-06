import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';

type SessionState = {
  data: Session | null;
  status: "loading" | "authenticated" | "unauthenticated";
  update: (data?: any) => Promise<Session | null>;
};

export const useProtectedSession = () => {
  const session = useSession();

  return session;
};