export const COOKIE_CONSENT_NAME = 'cookieConsent';

export interface CookieConsent {
  necessary: boolean;
  functional?: boolean;
  analytics?: boolean;
  lastUpdated?: number;
}

export const checkCookieConsent = (cookieValue: string | null): boolean => {
  if (!cookieValue) return false;
  
  try {
    const consent = JSON.parse(cookieValue) as CookieConsent;
    return consent.necessary === true;
  } catch {
    return false;
  }
};