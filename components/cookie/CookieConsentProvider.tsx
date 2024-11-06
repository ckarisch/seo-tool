"use client";

import { createContext, useContext, ReactNode } from 'react';
import { useCookieConsent, CookieConsent } from '@/hooks/useCookieConsent';

interface CookieConsentContextType {
  hasCookieConsent: CookieConsent | null;
  isLoading: boolean;
  resetCookieConsent: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const cookieConsent = useCookieConsent();

  return (
    <CookieConsentContext.Provider value={cookieConsent}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsentContext() {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error('useCookieConsentContext must be used within a CookieConsentProvider');
  }
  return context;
}