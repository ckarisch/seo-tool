"use client";

import { useEffect, useState } from 'react';
import styles from './CookieConsent.module.scss';
import { X, ChevronDown, ChevronUp, Cookie } from 'lucide-react';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { useRouter } from 'next/navigation';
import { useProtectedSession } from '@/hooks/useProtectedSession';

interface CookieCategory {
  id: string;
  name: string;
  description: string;
  required: boolean;
  cookies: {
    name: string;
    purpose: string;
    duration: string;
    type: string;
  }[];
}

const COOKIE_CONSENT_EVENT = 'cookieConsentUpdate';

interface ConsentUpdateDetail {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
}

type ConsentPreferences = ConsentUpdateDetail;

// Custom event type for TypeScript
declare global {
  interface WindowEventMap {
    [COOKIE_CONSENT_EVENT]: CustomEvent<ConsentUpdateDetail>;
  }
}

const cookieCategories: CookieCategory[] = [
  {
    id: 'necessary',
    name: 'Essential Cookies',
    description: 'These cookies are necessary for the website to function and cannot be switched off. They are usually only set in response to actions made by you which amount to a request for services.',
    required: true,
    cookies: [
      {
        name: 'next-auth.session-token',
        purpose: 'Authentication session management',
        duration: 'Session',
        type: 'HTTP Cookie'
      },
      {
        name: 'next-auth.csrf-token',
        purpose: 'CSRF protection',
        duration: 'Session',
        type: 'HTTP Cookie'
      },
      {
        name: '__Host-next-auth.csrf-token',
        purpose: 'Security token for authentication',
        duration: 'Session',
        type: 'HTTP Cookie'
      }
    ]
  },
  {
    id: 'functional',
    name: 'Functional Cookies',
    description: 'These cookies enable the website to provide enhanced functionality and personalisation. They may be set by us or by third party providers.',
    required: false,
    cookies: [
      {
        name: 'user_preferences',
        purpose: 'Stores user preferences and settings',
        duration: '1 year',
        type: 'HTTP Cookie'
      }
    ]
  },
  {
    id: 'analytics',
    name: 'Analytics Cookies',
    description: 'These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site.',
    required: false,
    cookies: [
      {
        name: 'vercel-analytics',
        purpose: 'Anonymous analytics data collection',
        duration: '1 year',
        type: 'HTTP Cookie'
      }
    ]
  }
];

export const CookieConsent = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const {hasConsent, loading} = useCookieConsent();
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    necessary: true,
    functional: false,
    analytics: false
  });
  const { data: session, status } = useProtectedSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading' || loading || hasConsent) return;
  }, [status, hasConsent, loading]);

  useEffect(() => {
    const savedPreferences = localStorage.getItem('cookieConsent');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences) as ConsentPreferences;
        setIsOpen(false);
        setPreferences(parsed);
      } catch (error) {
        localStorage.removeItem('cookieConsent');
      }
    }
  }, []);

  const emitConsentUpdate = (selectedPreferences: ConsentPreferences) => {
    const event = new CustomEvent<ConsentUpdateDetail>(COOKIE_CONSENT_EVENT, {
      detail: selectedPreferences,
    });
    window.dispatchEvent(event);
  };

  const toggleCategory = (categoryId: keyof ConsentPreferences) => {
    if (categoryId === 'necessary') return;
    setPreferences(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const toggleCategoryDetails = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleAcceptAll = () => {
    const allAccepted: ConsentPreferences = {
      necessary: true,
      functional: true,
      analytics: true
    };
    setPreferences(allAccepted);
    savePreferences(allAccepted);
    window.location.reload();
  };

  const handleAcceptSelected = () => {
    savePreferences(preferences);
    window.location.reload();
  };

  const savePreferences = (selectedPreferences: ConsentPreferences) => {
    const finalPreferences: ConsentPreferences = {
      ...selectedPreferences,
      necessary: true
    };

    localStorage.setItem('cookieConsent', JSON.stringify(finalPreferences));
    setIsOpen(false);
    
    emitConsentUpdate(finalPreferences);
    
    if (!finalPreferences.analytics) {
      window.localStorage.removeItem('va-firstview');
      window.localStorage.removeItem('va-sessionid');
    }
  };

  if (!isOpen || hasConsent || loading) return null;

  return (
    <div 
      className={styles.overlay}
      role="dialog" 
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleContainer}>
            <Cookie className={styles.icon} />
            <h2 id="cookie-consent-title">Cookie Settings</h2>
          </div>
          <button 
            className={styles.detailsToggle}
            onClick={() => setShowDetails(!showDetails)}
            aria-expanded={showDetails}
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
            {showDetails ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          </button>
        </div>

        <div className={styles.content}>
          <p>
            We use cookies to enhance your browsing experience and analyze our traffic. 
            Please choose which cookies you would like to accept. You can find more details
            in our <a href="/privacy">Privacy Policy</a>.
          </p>

          {showDetails && (
            <div className={styles.categories}>
              {cookieCategories.map(category => (
                <div key={category.id} className={styles.category}>
                  <div className={styles.categoryHeader}>
                    <div className={styles.categoryInfo}>
                      <label className={styles.categoryLabel}>
                        <input
                          type="checkbox"
                          checked={preferences[category.id as keyof ConsentPreferences]}
                          onChange={() => toggleCategory(category.id as keyof ConsentPreferences)}
                          disabled={category.required}
                          aria-describedby={`${category.id}-description`}
                        />
                        <span className={styles.categoryTitle}>
                          {category.name}
                          {category.required && (
                            <span className={styles.requiredBadge}>Required</span>
                          )}
                        </span>
                      </label>
                      <button 
                        className={styles.expandButton}
                        onClick={() => toggleCategoryDetails(category.id)}
                        aria-expanded={expandedCategories.includes(category.id)}
                        aria-controls={`${category.id}-details`}
                      >
                        {expandedCategories.includes(category.id) ? 
                          <ChevronUp aria-hidden="true" /> : 
                          <ChevronDown aria-hidden="true" />}
                      </button>
                    </div>
                    <p 
                      className={styles.categoryDescription}
                      id={`${category.id}-description`}
                    >
                      {category.description}
                    </p>
                  </div>

                  {expandedCategories.includes(category.id) && (
                    <div 
                      id={`${category.id}-details`}
                      className={styles.cookieDetails}
                    >
                      <table>
                        <thead>
                          <tr>
                            <th scope="col">Name</th>
                            <th scope="col">Purpose</th>
                            <th scope="col">Duration</th>
                            <th scope="col">Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {category.cookies.map(cookie => (
                            <tr key={cookie.name}>
                              <td>{cookie.name}</td>
                              <td>{cookie.purpose}</td>
                              <td>{cookie.duration}</td>
                              <td>{cookie.type}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button 
            className={styles.acceptSelected} 
            onClick={handleAcceptSelected}
          >
            Accept Selected
          </button>
          <button 
            className={styles.acceptAll} 
            onClick={handleAcceptAll}
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
};