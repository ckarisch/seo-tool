import _ from 'lodash';
import { Domain, User } from "@prisma/client";
import * as nodemailer from "nodemailer";
import { MailOptions } from "nodemailer/lib/json-transport";
import { generateWelcomeEmailHTML } from "./generateWelcomeEmailHTML";
import { PartialDomainWithDomainName } from '@/interfaces/domain';
import { NotificationType } from "@prisma/client";
import { prisma } from '@/lib/prisma';

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
            from: "Rankidang Notification <info@notification.rankidang.com>",
            to: [toEmail],
            subject: `Welcome to Rankidang - ${domain} Successfully Added`,
            html: htmlContent,
            replyTo: 'info@notification.rankidang.com'
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
            from: "Rankidang Notification <info@notification.rankidang.com>",
            to: [toEmail],
            subject,
            html: htmlContent,
            replyTo: 'info@notification.rankidang.com'
        });
    }

    private generateConsolidatedSubject(notifications: NotificationGroup): string {
        const errorCount = notifications.notifications.filter(n => n.type === 'error').length;
        const warningCount = notifications.notifications.filter(n => n.type === 'warning').length;
        const successCount = notifications.notifications.filter(n => n.type === 'success').length;

        const parts: string[] = [];
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
    InitialMessage,
    NewError,
    ErrorResolved
}

export const consolidatedCrawlNotification = async (
    userWithNotificationContacts: User & { notificationContacts: any[] },
    domain: PartialDomainWithDomainName & { notificationType?: NotificationType, id?: string },
    notifications: Array<{
        type: crawlNotificationType;
        errorPresent: boolean;
        urls: string[];
        additionalData?: any;
    }>,
    isInitialCrawl: boolean,
    isAnalysisMissing: boolean
) => {
    console.log('Starting consolidatedCrawlNotification:', {
        domainName: domain.domainName,
        notificationType: domain.notificationType,
        isInitialCrawl,
        isAnalysisMissing,
        notificationCount: notifications.length
    });

    const result = {
        sent: false,
        mailSent: false,
        notificationsSaved: 0
    }

    if (isAnalysisMissing) {
        console.log(`Analysis is missing for domain ${domain.domainName} - no notification sent`);
        return result;
    }

    if (!domain.id) {
        console.error(`Domain ID is missing for ${domain.domainName} - cannot save notifications`);
        return result;
    }

    const notificationContacts = userWithNotificationContacts.notificationContacts.length
        ? userWithNotificationContacts.notificationContacts
        : [userWithNotificationContacts];

    console.log(`Found ${notificationContacts.length} notification contacts`);

    if (isInitialCrawl) {
        console.log('Processing initial crawl notification');
        const initialNotification = notifications.find(n => n.type === crawlNotificationType.InitialMessage);

        if (initialNotification?.additionalData) {
            const metrics = {
                quickCheckScore: Math.round((initialNotification.additionalData.quickCheckScore || 0) * 100),
                performanceScore: Math.round((initialNotification.additionalData.performanceScore || 0) * 100),
                seoScore: Math.round((initialNotification.additionalData.seoScore || 0) * 100),
                accessibility: Math.round((initialNotification.additionalData.accessibility || 0) * 100),
                totalIssues: initialNotification.additionalData.totalErrors || 0
            };

            console.log('Sending welcome emails with metrics:', metrics);

            for (const contact of notificationContacts) {
                try {
                    await enhancedEmailer.sendWelcomeEmail(
                        contact.email,
                        domain.domainName,
                        metrics
                    );
                    result.sent = true;
                    result.mailSent = true;
                    console.log(`Welcome email sent successfully to ${contact.email}`);
                } catch (e) {
                    console.error(`Error sending welcome email to ${contact.email}:`, e);
                }
            }
            return result;
        }
    }

    console.log(`Processing ${notifications.length} notifications for domain ${domain.domainName}`);
    console.log('Current notification type setting:', domain.notificationType);

    const notificationGroup: NotificationGroup = {
        domain: domain.domainName,
        notifications: []
    };

    // Process notifications
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
            console.log('Created notification data:', {
                type: notificationData.type,
                title: notificationData.title
            });

            notificationGroup.notifications.push(notificationData);

            // Save notification to database if notifications are enabled
            if (domain.notificationType === NotificationType.NOTIFICATION ||
                domain.notificationType === NotificationType.BOTH) {
                try {
                    // First, count existing notifications
                    const existingCount = await prisma.notification.count({
                        where: { domainId: domain.id }
                    });

                    const max = 5;

                    // If we're at or above the limit, remove oldest notifications to make space
                    if (existingCount >= max) {
                        const notificationsToRemove = existingCount - (max - 1); // Remove enough to have space for 1 new

                        // Get the IDs of the oldest notifications
                        const oldestNotifications = await prisma.notification.findMany({
                            where: { domainId: domain.id },
                            orderBy: { createdAt: 'asc' },
                            take: notificationsToRemove,
                            select: { id: true }
                        });

                        // Delete the oldest notifications
                        await prisma.notification.deleteMany({
                            where: {
                                id: {
                                    in: oldestNotifications.map(n => n.id)
                                }
                            }
                        });
                    }

                    // Save the new notification
                    const savedNotification = await prisma.notification.create({
                        data: {
                            domainId: domain.id,
                            type: notificationData.type,
                            title: notificationData.title,
                            message: notificationData.message,
                            urls: notificationData.urls || [],
                            metadata: notification.additionalData || {},
                            read: false,
                            createdAt: new Date()
                        }
                    });

                    result.notificationsSaved++;
                } catch (error) {
                    console.error('Error saving notification to database:', error);
                    console.error('Failed notification data:', {
                        domainId: domain.id,
                        type: notificationData.type,
                        title: notificationData.title
                    });
                }
            } else {
                console.log('Skipping database save - notifications not enabled for this type');
            }
        } else {
            console.log('No notification data created for type:', crawlNotificationType[notification.type]);
        }
    }

    // Send email notifications if enabled
    if (domain.notificationType === NotificationType.MAIL ||
        domain.notificationType === NotificationType.BOTH) {
        console.log('Sending email notifications to contacts');

        for (const contact of notificationContacts) {
            try {
                await enhancedEmailer.sendConsolidatedNotification(
                    contact.email,
                    contact.name,
                    notificationGroup
                );
                result.sent = true;
                result.mailSent = true;
                console.log(`Consolidated notification email sent to ${contact.email}`);
            } catch (e) {
                console.error(`Error sending notification email to ${contact.email}:`, e);
            }
        }
    } else {
        console.log('Skipping email notifications - not enabled for this type');
    }

    console.log('Notification processing complete:', {
        sent: result.sent,
        mailSent: result.mailSent,
        notificationsSaved: result.notificationsSaved
    });

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
                `Initial SEO Score: ${Math.floor(additionalData.quickCheckScore * 100)}%` : '';
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
            let scoreDetails: string[] = [];

            // Add performance metrics if available
            if (additionalData?.metrics) {
                const metrics = additionalData.metrics;
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

            const changes: string[] = [];
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

        case crawlNotificationType.NewError:
            if (!additionalData?.errors || additionalData.errors.length === 0) return null;

            // Group errors by type and URL
            const groupedErrors = additionalData.errors.reduce((acc: any, error: any) => {
                const key = `${error.type}_${error.category}`;
                if (!acc[key]) {
                    acc[key] = {
                        type: error.type,
                        category: error.category,
                        message: error.message,
                        occurrences: [],
                    };
                }

                // Add occurrence with URL and metadata
                acc[key].occurrences.push({
                    url: error.url,
                    metadata: error.metadata
                });

                return acc;
            }, {});

            // Format the error list
            const errorSummary = Object.values(groupedErrors).map((group: any) => {
                const count = group.occurrences.length;
                let summary = `- ${group.message} (${group.category})\n`;
                summary += `  Found on ${count} ${count === 1 ? 'page' : 'pages'}\n`;

                // Add detailed breakdown for each occurrence
                group.occurrences.forEach((occurrence: any) => {
                    if (occurrence.metadata) {
                        const meta = occurrence.metadata;
                        summary += `  • ${occurrence.url}\n`;
                        if (meta.count) summary += `    Count: ${meta.count}\n`;
                        if (meta.locations) summary += `    Details: ${meta.locations.join(", ")}\n`;
                        if (meta.message) summary += `    Info: ${meta.message}\n`;
                    }
                });

                return summary;
            }).join('\n');

            // Properly type the URLs array
            const affectedUrls = Object.values(groupedErrors).reduce((urls: string[], group: any) => {
                group.occurrences.forEach((occurrence: any) => {
                    if (occurrence.url && typeof occurrence.url === 'string') {
                        urls.push(occurrence.url);
                    }
                });
                return urls;
            }, []);

            // Remove duplicates and filter out any non-string values
            const uniqueUrls = [...new Set(affectedUrls)].filter((url): url is string =>
                typeof url === 'string' && url.length > 0
            );

            return {
                type: 'error',
                title: `New ${additionalData.severity.toLowerCase()} Errors Detected`,
                message: `${baseMessage}\n\nSummary of new errors:\n${errorSummary}`,
                urls: uniqueUrls
            };

        case crawlNotificationType.ErrorResolved:
            if (!additionalData?.errors || additionalData.errors.length === 0) return null;

            const resolvedList = additionalData.errors.map((error: any) =>
                `- ${error.message} (${error.category})`
            ).join('\n');

            return {
                type: 'success',
                title: 'Errors Resolved',
                message: `Great news! The following errors have been resolved:\n${resolvedList}`,
                urls: additionalData.errors.map((e: any) => e.url)
            };

        case crawlNotificationType.GeneralError:
            if (!additionalData?.errors || additionalData.errors.length === 0) return null;

            let messageTitle = 'General Error';
            let messageType: 'error' | 'warning' = 'error';

            // Determine severity level for title and type
            if (additionalData.severity) {
                switch (additionalData.severity) {
                    case 'CRITICAL':
                        messageTitle = 'Critical Error';
                        messageType = 'error';
                        break;
                    case 'HIGH':
                        messageTitle = 'High Priority Error';
                        messageType = 'error';
                        break;
                    case 'MEDIUM':
                        messageTitle = 'Medium Priority Issue';
                        messageType = 'warning';
                        break;
                    case 'LOW':
                        messageTitle = 'Low Priority Issue';
                        messageType = 'warning';
                        break;
                }
            }

            const errorCategoryUrls = [];

            if (additionalData.erros && additionalData.erros.length) {
                const errorsbyCategory = additionalData.erros.reduce(function (obj, error) {
                    if (!obj[error.category]) {
                        obj[error.category] = [error];
                        // errorCategoryUrls[error.category] = error.u
                    } else {
                        obj[error.category].push(error);
                    }
                    return obj;
                })

                const errorDetails = errorsbyCategory.map((category: any) => {
                    const error = category[0];
                    let details = `- ${error.message}`;
                    if (error.category) {
                        details += ` (${error.category})`;
                    }
                    if (error.metadata) {
                        // Add any relevant metadata
                        const meta: string[] = [];
                        if (error.metadata.count) meta.push(`Occurrences: ${category.length}`);
                        if (error.metadata.firstSeen) meta.push(`First seen: ${new Date(error.metadata.firstSeen).toLocaleString()}`);
                        meta.push(`URLs: ` + urls.join(', '));
                        if (meta.length > 0) {
                            details += `\n  ${meta.join(' | ')}`;
                        }
                    }
                    return details;
                }).join('\n');


                return {
                    type: messageType,
                    title: messageTitle,
                    message: `${baseMessage}\n\nThe following issues were detected:\n${errorDetails}`,
                    urls
                };
            }

        default:
            return null;
    }
}
