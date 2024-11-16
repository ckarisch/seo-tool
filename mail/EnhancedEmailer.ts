import { Domain, User } from "@prisma/client";
import * as nodemailer from "nodemailer";
import { MailOptions } from "nodemailer/lib/json-transport";
import { prisma } from '@/lib/prisma';
import { renderWelcomeEmail } from "@/util/emailRenderer";
import { generateWelcomeEmailHTML } from "./generateWelcomeEmailHTML";

interface NotificationGroup {
    domain: string;
    notifications: Array<{
        type: 'error' | 'warning' | 'success';
        title: string;
        message: string;
        urls?: string[];
    }>;
}

export class EnhancedEmailer {
    private readonly transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST!,
            port: parseInt(process.env.MAIL_PORT!),
            auth: {
                user: process.env.MAIL_USER!,
                pass: process.env.MAIL_PASSWORD!
            }
        });
    }

    private async sendEmail(mailOptions: MailOptions) {
        return await this.transporter.sendMail(mailOptions);
    }

    public async sendWelcomeEmail(
        toEmail: string,
        domain: string,
        metrics: {
            quickCheckScore: number;
            performanceScore: number;
            seoScore: number;
            accessibility: number;
            totalIssues: number;
        }
    ) {
        const htmlContent = generateWelcomeEmailHTML(domain, metrics);
        
        await this.sendEmail({
            from: "SEO Notification <notification@formundzeichen.at>",
            to: [toEmail],
            subject: `Welcome to Rankidang - ${domain} Successfully Added`,
            html: htmlContent,
            replyTo: 'notification@formundzeichen.at'
        });
    }

    private generateEmailHTML(notifications: NotificationGroup, recipientName: string): string {
        const getTypeStyles = (type: 'error' | 'warning' | 'success') => {
            switch (type) {
                case 'error':
                    return 'border-left: 4px solid #dc3545; background-color: #fff5f5;';
                case 'warning':
                    return 'border-left: 4px solid #ffc107; background-color: #fff9e6;';
                case 'success':
                    return 'border-left: 4px solid #198754; background-color: #f0fff4;';
            }
        };

        const notificationCards = notifications.notifications.map((notification, index) => `
            <div style="margin-bottom: 20px; padding: 15px; border-radius: 6px; ${getTypeStyles(notification.type)}">
                <h2 style="color: #495057; font-size: 20px; margin-bottom: 10px;">${notification.title}</h2>
                <p style="color: #6c757d; font-size: 16px; line-height: 1.5; margin-bottom: 15px; white-space: pre-line;">${notification.message}</p>
                ${notification.urls ? `
                    <div style="margin: 15px 0; padding: 10px; background-color: #f8f9fa; border-radius: 4px;">
                        <strong>Affected URLs:</strong>
                        <ul style="margin: 5px 0;">
                            ${notification.urls.map(url => `<li style="margin: 5px 0; word-break: break-all;">${url}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `).join('');

        const dashboardUrl = `${process.env.NEXT_PUBLIC_API_DOMAIN}/app/domains/${notifications.domain}`;

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>SEO Notification</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                    <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #e9ecef;">
                        <img src="rankidang.com/logo.svg" alt="Rankidang Logo" style="width: 120px; height: auto; margin-bottom: 15px;">
                        <h1 style="color: #212529; font-size: 24px; margin-bottom: 15px;">SEO Notification Summary</h1>
                    </div>
                    
                    <div style="padding: 30px 0;">
                        ${notificationCards}
                        
                        <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0d6efd; color: #ffffff !important; text-decoration: none; border-radius: 4px; font-weight: 500; margin-top: 15px;">
                            View Details in Dashboard
                        </a>
                    </div>

                    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 14px;">
                        <p>This is an automated message from your SEO monitoring tool.</p>
                        <p>© ${new Date().getFullYear()} Rankidang. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    public async sendConsolidatedNotification(
        toEmail: string,
        toName: string,
        notifications: NotificationGroup
    ) {
        const htmlContent = this.generateEmailHTML(notifications, toName);
        const subject = this.generateConsolidatedSubject(notifications);

        await this.sendEmail({
            from: "SEO Notification <notification@formundzeichen.at>",
            to: [toEmail],
            subject,
            html: htmlContent,
            replyTo: 'notification@formundzeichen.at'
        });
    }

    private generateConsolidatedSubject(notifications: NotificationGroup): string {
        const errorCount = notifications.notifications.filter(n => n.type === 'error').length;
        const warningCount = notifications.notifications.filter(n => n.type === 'warning').length;
        const successCount = notifications.notifications.filter(n => n.type === 'success').length;

        const parts = [];
        if (errorCount > 0) parts.push(`❗${errorCount} Error${errorCount > 1 ? 's' : ''}`);
        if (warningCount > 0) parts.push(`⚠️${warningCount} Warning${warningCount > 1 ? 's' : ''}`);
        if (successCount > 0) parts.push(`✅${successCount} Success${successCount > 1 ? 's' : ''}`);

        return `${parts.join(' | ')} - ${notifications.domain}`;
    }
}

export const enhancedEmailer = new EnhancedEmailer();

export enum crawlNotificationType {
    Error503,
    Error404,
    WarningDoubleSlash,
    ErrorUnknown,
    Score,
    Robots,
    GeneralError,
    InitialMessage
}

export const consolidatedCrawlNotification = async (
    userWithNotificationContacts: User & { notificationContacts: any[] },
    domain: Domain,
    notifications: Array<{
        type: crawlNotificationType;
        errorPresent: boolean;
        urls: string[];
        additionalData?: any;
    }>,
    isInitialCrawl: boolean,
    isAnalysisMissing: boolean
) => {
    const result = {
        sent: false
    }
    if (isAnalysisMissing) {
        console.log(`analysis are missing - no notification sent`);
        return result;
    }

    const notificationContacts = userWithNotificationContacts.notificationContacts.length
        ? userWithNotificationContacts.notificationContacts
        : [userWithNotificationContacts];

    if (isInitialCrawl) {
        // Find initial message notification to get metrics
        const initialNotification = notifications.find(n => n.type === crawlNotificationType.InitialMessage);
        
        if (initialNotification?.additionalData) {
            const metrics = {
                quickCheckScore: Math.round((initialNotification.additionalData.quickCheckScore || 0) * 100),
                performanceScore: Math.round((initialNotification.additionalData.performanceScore || 0) * 100),
                seoScore: Math.round((initialNotification.additionalData.seoScore || 0) * 100),
                accessibility: Math.round((initialNotification.additionalData.accessibility || 0) * 100),
                totalIssues: initialNotification.additionalData.totalErrors || 0
            };

            // Send welcome email to each contact
            for (const contact of notificationContacts) {
                try {
                    await enhancedEmailer.sendWelcomeEmail(
                        contact.email,
                        domain.domainName,
                        metrics
                    );
                    result.sent = true;
                    console.log(`Welcome email sent to ${contact.email}`);
                } catch (e) {
                    console.error(`Error sending welcome email to ${contact.email}:`, e);
                }
            }
            return result;
        }
    }

    // Rest of the function remains the same...
    const notificationGroup: NotificationGroup = {
        domain: domain.domainName,
        notifications: []
    };

    for (const notification of notifications) {
        const notificationData = createNotificationData(
            notification.type,
            notification.errorPresent,
            domain.domainName,
            notification.urls,
            notification.additionalData,
            !domain.initialMessageSent
        );

        if (notificationData) {
            notificationGroup.notifications.push(notificationData);
        }
    }

    // Send consolidated notification to each contact
    for (const contact of notificationContacts) {
        try {
            await enhancedEmailer.sendConsolidatedNotification(
                contact.email,
                contact.name,
                notificationGroup
            );
            result.sent = true;
            console.log(`Consolidated notification sent to ${contact.email}`);
        } catch (e) {
            console.error(`Error sending notification to ${contact.email}:`, e);
        }
    }
    return result;
};

function createNotificationData(
    type: crawlNotificationType,
    errorPresent: boolean,
    domain: string,
    urls: string[],
    additionalData?: any,
    isInitialMessage: boolean = false
): {
    type: 'error' | 'warning' | 'success';
    title: string;
    message: string;
    urls: string[];
} | null {
    const baseMessage = isInitialMessage
        ? "During the initial analysis of your website, we detected the following:"
        : "We detected the following changes on your website:";

    switch (type) {
        case crawlNotificationType.InitialMessage:
            const scoreInfo = additionalData?.quickCheckScore ?
                `Initial Quick Check Score: ${Math.floor(additionalData.quickCheckScore * 100)}%` : '';
            const performanceInfo = additionalData?.performanceScore ?
                `\nPerformance Score: ${Math.floor(additionalData.performanceScore * 100)}%` : '';
            const errorInfo = additionalData?.totalErrors ?
                `\nIdentified Issues: ${additionalData.totalErrors}` : '';

            return {
                type: 'success',
                title: 'Domain Successfully Added',
                message: `Congratulations! Your domain ${domain} has been successfully added to our monitoring system and the initial analysis is complete.\n\n${scoreInfo}${performanceInfo}${errorInfo}\n\nWe'll keep monitoring your domain and notify you of any significant changes or issues that require attention.`,
                urls
            };
        case crawlNotificationType.Error503:
            return {
                type: errorPresent ? 'error' : 'success',
                title: errorPresent ? '503 Service Unavailable Error' : '503 Error Resolved',
                message: errorPresent
                    ? `${baseMessage} A 503 Service Unavailable error was detected on ${domain}.`
                    : `Great news! The previously detected 503 Service Unavailable error on ${domain} has been resolved.`,
                urls
            };

        case crawlNotificationType.Error404:
            return {
                type: errorPresent ? 'error' : 'success',
                title: errorPresent ? '404 Not Found Error' : '404 Error Resolved',
                message: errorPresent
                    ? `${baseMessage} A 404 Not Found error was detected on ${domain}.`
                    : `Great news! The previously detected 404 Not Found error on ${domain} has been resolved.`,
                urls
            };

        case crawlNotificationType.Score:
            const oldScore = Math.floor((additionalData?.oldScore || 0) * 100);
            const newScore = Math.floor((additionalData?.newScore || 0) * 100);
            const scoreDiff = newScore - oldScore;

            // Generate detailed score analysis
            let scoreDetails = [];

            // Add performance metrics if available
            if (additionalData?.metrics) {
                const metrics = additionalData.metrics;
                if (metrics.performanceScore !== null) {
                    scoreDetails.push(`Performance: ${Math.floor(metrics.performanceScore * 100)}%`);
                }
                if (metrics.seoScore !== null) {
                    scoreDetails.push(`SEO: ${Math.floor(metrics.seoScore * 100)}%`);
                }
                if (metrics.accessibility !== null) {
                    scoreDetails.push(`Accessibility: ${Math.floor(metrics.accessibility * 100)}%`);
                }
                scoreDetails.push(`Errors: ${metrics.errors}`);
                scoreDetails.push(`Warnings: ${metrics.warnings}`);
            }

            // Build detailed message
            let detailedMessage = `${baseMessage}\n\nYour SEO score has ${scoreDiff >= 0 ? 'improved' : 'decreased'} from ${oldScore}% to ${newScore}% (${scoreDiff >= 0 ? '+' : ''}${scoreDiff}%).`;

            if (scoreDetails.length > 0) {
                detailedMessage += `\n\nDetailed Metrics:\n${scoreDetails.join('\n')}`;
            }

            // Add critical issues if present
            if (additionalData?.issues) {
                const criticalIssues = additionalData.issues
                    .filter((issue: any) => issue.severity === 'critical' || issue.severity === 'error')
                    .map((issue: any) => `- ${issue.message}`);

                if (criticalIssues.length > 0) {
                    detailedMessage += `\n\nCritical Issues:\n${criticalIssues.join('\n')}`;
                }
            }

            return {
                type: scoreDiff >= 0 ? 'success' : 'warning',
                title: `SEO Score ${scoreDiff >= 0 ? 'Improvement' : 'Alert'}: ${Math.abs(scoreDiff)}% Change`,
                message: detailedMessage,
                urls
            };

        case crawlNotificationType.Robots:
            if (!additionalData?.updatedDomain) return null;

            const changes = [];
            const oldDomain = additionalData.oldDomain as Domain;
            const updatedDomain = additionalData.updatedDomain as Domain;

            if (updatedDomain.robotsIndex !== oldDomain.robotsIndex) {
                changes.push(`index → ${updatedDomain.robotsIndex ? 'index' : 'noindex'}`);
            }
            if (updatedDomain.robotsFollow !== oldDomain.robotsFollow) {
                changes.push(`follow → ${updatedDomain.robotsFollow ? 'follow' : 'nofollow'}`);
            }

            return {
                type: errorPresent ? 'warning' : 'success',
                title: 'Robots Meta Tags Updated',
                message: `${baseMessage}\nChanges in robots meta tags: ${changes.join(', ')}`,
                urls
            };

        default:
            return null;
    }
}