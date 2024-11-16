import { renderToStaticMarkup } from 'react-dom/server';

interface WelcomeEmailMetrics {
  quickCheckScore: number;
  performanceScore: number;
  seoScore: number;
  accessibility: number;
  totalIssues: number;
}

export function generateWelcomeEmailHTML(domain: string, metrics: {
    quickCheckScore: number;
    performanceScore: number;
    seoScore: number;
    accessibility: number;
    totalIssues: number;
  }): string {
    const getMetricCardHtml = (
      title: string,
      value: number,
      color: string,
      icon: string = '📊'
    ) => `
      <div style="background-color: ${color}15; padding: 1rem; border-radius: 0.5rem;">
        <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
          <span style="margin-right: 0.5rem;">${icon}</span>
          <h3 style="margin: 0; color: ${color}; font-weight: 600;">${title}</h3>
        </div>
        <p style="margin: 0; font-size: 1.5rem; font-weight: bold; color: ${color};">${value}%</p>
      </div>
    `;
  
    const dashboardUrl = `${process.env.NEXT_PUBLIC_FE_DOMAIN}/app/domains/${domain}`;
    const logoUrl = `${process.env.NEXT_PUBLIC_FE_DOMAIN}/images/email/logo.png`; // PNG version
    const logoUrlRetina = `${process.env.NEXT_PUBLIC_FE_DOMAIN}/images/email/logo@2x.png`; // Retina version
  
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Rankidang</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #e9ecef;">
            <!-- Using srcset for retina support -->
            <img src="${logoUrl}" 
                 srcset="${logoUrl} 1x, ${logoUrlRetina} 2x" 
                 alt="Rankidang Logo" 
                 style="width: 120px; height: auto; margin-bottom: 15px;"
                 width="120">
            <div style="display: flex; justify-content: center; margin-bottom: 1rem;">
              <span style="width: 4rem; height: 4rem; color: #22c55e; font-size: 2.5rem;">✅</span>
            </div>
            <h1 style="color: #212529; font-size: 1.875rem; font-weight: bold; margin-bottom: 0.5rem;">Domain Successfully Added</h1>
            <p style="color: #6b7280; font-size: 1.125rem;">${domain}</p>
          </div>

        <!-- Main Content -->
        <div style="padding: 2rem 0;">
          <!-- Success Message -->
          <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 1rem; border-radius: 0 0.375rem 0.375rem 0; margin-bottom: 2rem;">
            <p style="color: #166534; margin: 0;">
              Congratulations! Your domain has been successfully added to our monitoring system and the initial analysis is complete.
            </p>
          </div>

          <!-- Metrics Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
            ${getMetricCardHtml('Quick Check Score', metrics.quickCheckScore, '#3b82f6', '📊')}
            ${getMetricCardHtml('Performance', metrics.performanceScore, '#8b5cf6', '⚡')}
            ${getMetricCardHtml('SEO Score', metrics.seoScore, '#6366f1', '🎯')}
            ${getMetricCardHtml('Accessibility', metrics.accessibility, '#14b8a6', '♿')}
          </div>

          <!-- Issues Summary -->
          <div style="background-color: #fff7ed; padding: 1rem; border-radius: 0.5rem; margin-bottom: 2rem;">
            <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
              <span style="margin-right: 0.5rem;">⚠️</span>
              <h3 style="margin: 0; color: #c2410c; font-weight: 600;">Identified Issues</h3>
            </div>
            <p style="margin: 0; font-size: 1.5rem; font-weight: bold; color: #c2410c;">${metrics.totalIssues}</p>
          </div>

          <!-- Next Steps -->
          <div style="background-color: #f8fafc; padding: 1.5rem; border-radius: 0.5rem;">
            <h3 style="color: #1e293b; font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem;">What's Next?</h3>
            <ul style="list-style: none; padding: 0; margin: 0; color: #475569;">
              <li style="display: flex; align-items: flex-start; margin-bottom: 0.75rem;">
                <span style="color: #22c55e; margin-right: 0.5rem;">✓</span>
                <span>We'll continuously monitor your domain for any changes or issues</span>
              </li>
              <li style="display: flex; align-items: flex-start; margin-bottom: 0.75rem;">
                <span style="color: #22c55e; margin-right: 0.5rem;">✓</span>
                <span>You'll receive notifications about significant changes in SEO metrics</span>
              </li>
              <li style="display: flex; align-items: flex-start;">
                <span style="color: #22c55e; margin-right: 0.5rem;">✓</span>
                <span>Regular reports will help you track your website's performance over time</span>
              </li>
            </ul>
          </div>

          <!-- Dashboard Link -->
          <div style="text-align: center; margin-top: 2rem;">
            <a href="${dashboardUrl}" 
               style="display: inline-block; padding: 0.75rem 1.5rem; background-color: #0d6efd; color: #ffffff; text-decoration: none; border-radius: 0.375rem; font-weight: 500;">
              View Details in Dashboard
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 1.25rem; border-top: 1px solid #e9ecef;">
          <p style="color: #6b7280; font-size: 0.875rem; margin: 0;">© ${new Date().getFullYear()} Rankidang. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}