import { useEffect, useState } from 'react';

export const useCookieConsent = () => {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean | null>(true);

  useEffect(() => {
    const checkConsent = () => {
      const consentData = localStorage.getItem('cookie-consent');
      if (consentData) {
        try {
          const parsed = JSON.parse(consentData);
          setHasConsent(parsed.necessary === true);
        } catch (e) {
          setHasConsent(false);
        }
      } else {
        setHasConsent(false);
      }
      setLoading(false)
    };

    checkConsent();

    window.addEventListener('storage', checkConsent);
    return () => window.removeEventListener('storage', checkConsent);
  }, []);

  return {hasConsent, loading};
};