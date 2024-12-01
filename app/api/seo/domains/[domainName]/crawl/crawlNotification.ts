import { Domain, DomainCrawl } from "@prisma/client";
import * as nodemailer from "nodemailer";
import { MailOptions } from "nodemailer/lib/json-transport";

export class Emailer {
    private readonly transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST!,
            port: parseInt(process.env.MAIL_PORT!),
            auth: {
                user: process.env.MAIL_USER!, // generated ethereal user
                pass: process.env.MAIL_PASSWORD! // generated ethereal password
            }

        });
    }

    public async sendEmail(mailOptions: MailOptions) {
        return await this.transporter.sendMail(mailOptions);
    }

    public async sendNotification(toEmail: string, messageHtml: string, subject: string) {
        await this.sendEmail(sendMessageTemplate(toEmail, messageHtml, subject));
    }

}

export const emailer = new Emailer();


export const sendMessageTemplate = (
    toEmail: string,
    messageHtml: string,
    subject: string
) => {
    return {
        from: "Rankidang Notification <info@notification.rankidang.com>",
        to: [toEmail], // list of receivers
        subject,
        text: messageHtml,
        html: messageHtml,
        replyTo: 'info@notification.rankidang.com'
    } as MailOptions;
};


export enum crawlNotificationType {
    Error503,
    Error404,
    WarningDoubleSlash,
    ErrorUnknown,
    Score,
    Robots
}

export const crawlNotification = async (userWithNotificationContacts: any, oldDomainDatabaseEntry: Domain, type: crawlNotificationType, errorPresent: boolean, domain: string, urls: string[], score: number, updatedDomain?: Domain | null) => {
    const user = userWithNotificationContacts;
    const notificationContacts = user.notificationContacts.length ? user.notificationContacts : [user];
    let title = '';

    for (const contact of notificationContacts) {
        switch (type) {
            case crawlNotificationType.Error503:
                console.log('prepare error 503 notification');
                if (errorPresent) {
                    title = '503 Error Detected';
                    await sendNotification(contact.email, contact.name, '❗' + title, title, `A 503 error has been identified on the website ${domain}.`, domain, urls);
                }
                else {
                    title = '503 Error Resolved';
                    await sendNotification(contact.email, contact.name, '✅' + title, title, `The 503 Service Unavailable error on ${domain} has been successfully addressed and resolved. `, domain, urls);
                }
                break;
            case crawlNotificationType.Error404:
                console.log('prepare error 404 notification');
                if (errorPresent) {
                    title = '404 Error Detected';
                    await sendNotification(contact.email, contact.name, '❗' + title, title, `A 404 error has been identified on the website ${domain}.`, domain, urls);
                }
                else {
                    title = '404 Error Resolved';
                    await sendNotification(contact.email, contact.name, '✅' + title, title, `The 404 Service Unavailable error on ${domain} has been successfully addressed and resolved. `, domain, urls);
                }
                break;
            case crawlNotificationType.Score:
                console.log('prepare score notification');
                const oldScore = oldDomainDatabaseEntry.score ? Math.floor(oldDomainDatabaseEntry.score * 100) : 0;
                title = `Score changed from ${oldScore} to ${Math.floor(score * 100)} (${domain})`;
                if (errorPresent) {
                    await sendNotification(contact.email, contact.name, '❗' + title, title, `❗There are errors on ${domain}. Look at the dashboard for more details.`, domain, urls);
                }
                else {
                    await sendNotification(contact.email, contact.name, '✅' + title, title, `✅There are no errors on ${domain}.`, domain, urls);
                }
                break;
            case crawlNotificationType.Robots:
                if(!updatedDomain){
                    console.log('Robots message error: no updatedDomain present');
                    break;
                }
                const indexStringOld = oldDomainDatabaseEntry.robotsIndex ? 'index' : 'noindex';
                const followStringOld = oldDomainDatabaseEntry.robotsFollow ? 'follow' : 'nofollow';
                
                const indexString = updatedDomain.robotsIndex ? 'index' : 'noindex';
                const followString = updatedDomain.robotsFollow ? 'follow' : 'nofollow';

                console.log('prepare robots notification');
                const shortTitle = `Robots ${indexString}, ${followString} (${domain})`;
                title = `Robots changed from  ${indexStringOld}, ${followStringOld} to  ${indexString}, ${followString} (${domain})`;
                if (errorPresent) {
                    await sendNotification(contact.email, contact.name, '❗' + shortTitle, title, `❗There are errors on ${domain}. Look at the dashboard for more details.`, domain, urls);
                }
                else {
                    await sendNotification(contact.email, contact.name, '✅' + shortTitle, title, `✅Robots index and follow tags are set on ${domain}.`, domain, urls);
                }
                break;
        }
    }
}


export const sendNotification = async (toEmail: string, toName: string, subject: string, title: string, message: string, domain: string, urls: string[]) => {
    const messageHtml = '<html><body><h1>' + title + '</h1><br/><div>' + message + '</div><div>Affected URLs: <div>' + urls.join('<br/>') + '</div></div><br/><div><a href="' + process.env.NEXT_PUBLIC_API_DOMAIN + '/app/domains/' + domain + '">Show details</a></div></body></html>';

    try {
        await emailer.sendNotification(toEmail, messageHtml, subject);
        console.log('message sent');

    }
    catch (e: any) {
        console.log('sendNotification error');
        console.log(e);
    }

}