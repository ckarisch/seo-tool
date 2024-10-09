"use client";
// components/SecureMailto.tsx
import React, { useState, useEffect } from 'react';

interface SecureMailtoProps {
  email: string;
  subject?: string;
  body?: string;
  className?: string;
  children?: React.ReactNode;
}

const SecureMailto: React.FC<SecureMailtoProps> = ({
  email,
  subject = '',
  body = '',
  className = '',
  children
}) => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Base64 encode the email address
  const encode = (str: string): string => {
    if (typeof window === 'undefined') return str;
    return window.btoa(str);
  };

  // Decode the email address
  const decode = (str: string): string => {
    if (typeof window === 'undefined') return str;
    return window.atob(str);
  };

  // Create encoded mailto link with optional subject and body
  const createMailtoLink = (decodedEmail: string): string => {
    const params = new URLSearchParams();
    if (subject) params.append('subject', subject);
    if (body) params.append('body', body);
    
    const queryString = params.toString();
    return `mailto:${decodedEmail}${queryString ? '?' + queryString : ''}`;
  };

  // Reverse the email to make it harder for bots to scrape
  const reverseEmail = (str: string): string => {
    return str.split('').reverse().join('');
  };

  // Encode the full email for the data attribute
  const encodedEmail = encode(reverseEmail(email));

  // Handle click event
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const decodedEmail = decode(encodedEmail);
    const originalEmail = reverseEmail(decodedEmail);
    window.location.href = createMailtoLink(originalEmail);
  };

  // Server-side rendering safe display
  const displayEmail = isClient ? 
    reverseEmail(decode(encodedEmail)) : 
    '...';

  return (
    <a
      href="#"
      onClick={handleClick}
      className={className}
      data-encoded-email={encodedEmail}
      rel="nofollow"
    >
      {children || displayEmail}
    </a>
  );
};

export default SecureMailto;