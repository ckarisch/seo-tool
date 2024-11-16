// utils/emailRenderer.ts
import WelcomeEmail from '@/components/mail/WelcomeEmail';
import { renderToString } from 'react-dom/server';

export function renderWelcomeEmail(domain: string, metrics: {
  quickCheckScore: number;
  performanceScore: number;
  seoScore: number;
  accessibility: number;
  totalIssues: number;
}) {
  const emailComponent = renderToString(
    WelcomeEmail({ domain, metrics })
  );
  
  // Wrap with email template
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Rankidang</title>
      <style>
        /* Include necessary CSS here */
      </style>
    </head>
    <body>
      ${emailComponent}
    </body>
    </html>
  `;
}