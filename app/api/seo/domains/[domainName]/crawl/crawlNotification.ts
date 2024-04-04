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

    public sendEmail(mailOptions: MailOptions) {
        return this.transporter.sendMail(mailOptions);
    }

    public sendNotification(toEmail: string, messageHtml: string) {
        this.sendEmail(sendMessageTemplate(toEmail, messageHtml));
    }

}

export const emailer = new Emailer();


export const sendMessageTemplate = (
    toEmail: string,
    messageHtml: string
) => {
    return {
        from: "SEO Notification <notification@formundzeichen.at>",
        to: [toEmail], // list of receivers
        subject: "Neue Benachrichtigung",
        text: messageHtml,
        html: messageHtml,
        replyTo: 'notification@formundzeichen.at'
    } as MailOptions;
};


export enum crawlNotificationType {
    Error503,
    Error404,
    WarningDoubleSlash,
    ErrorUnknown
}

export const crawlNotification = (userWithNotificationContacts: any, type: crawlNotificationType, domain: string, urls: string[]) => {
    const user = userWithNotificationContacts;
    const notificationContacts = user.notificationContacts.length ? user.notificationContacts : [user];

    for (const contact of notificationContacts) {
        switch (type) {
            case crawlNotificationType.Error503:
                console.log('prepare error 503 notification');
                sendNotification(contact.email, contact.name, '503 Fehler erkannt', `Ein 503 Fehler wurde auf der Website ${domain} gefunden.`, domain, urls)
                break;
            case crawlNotificationType.Error404:
                console.log('prepare error 404 notification');
                sendNotification(contact.email, contact.name, '404 Fehler erkannt', `Ein 404 Fehler wurde auf der Website ${domain} gefunden.`, domain, urls)
                break;
        }
    }
}


export const sendNotification = async (toEmail: string, toName: string, title: string, message: string, domain: string, urls: string[]) => {


    const messageHtml = '<html><body><h1>' + title + '</h1><br/><div>' + message + '</div><div>Betroffene URLs: <div>' + urls.join('<br/>') + '</div></div><br/><div><a href="' + process.env.NEXT_PUBLIC_API_DOMAIN + '/app/domains/' + domain + '">Details anzeigen</a></div></body></html>';

    try {
        emailer.sendNotification(toEmail, messageHtml);
        console.log('message sent');

    }
    catch (e: any) {
        console.log('sendNotification error');
        console.log(e);
    }

}