
const brevo = require('@getbrevo/brevo');
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export enum crawlNotificationType {
    Error404,
    WarningDoubleSlash,
    ErrorUnknown
}

export const crawlNotification = (userWithNotificationContacts: any, type: crawlNotificationType, domain: string) => {
    const user = userWithNotificationContacts;
    const notificationContacts = user.notificationContacts.length ? user.notificationContacts : [user];

    for (const contact of notificationContacts) {
        switch (type) {
            case crawlNotificationType.Error404:
                sendNotification(contact.email, contact.name, '404 Fehler erkannt', `Ein 404 Fehler wurde auf der Website ${domain} gefunden.`, domain)
                break;
        }
    }
}


export const sendNotification = (toEmail: string, toName: string, title: string, message: string, domain: string) => {
    let apiInstance = new brevo.TransactionalEmailsApi();

    let apiKey = apiInstance.authentications['apiKey'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    let sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.subject = 'Neue Benachrichtigung';
    sendSmtpEmail.htmlContent = '<html><body><h1>{{params.heading}}</h1><br/><div>{{params.message}}</div><div><a href="{{params.appDomain}}/app/domains/{{params.domain}}">Details anzeigen</a></div></body></html>';
    sendSmtpEmail.sender = { 'name': 'SEO Notification', 'email': 'notification@formundzeichen.at' };
    sendSmtpEmail.to = [
        { 'email': toEmail, 'name': toName }
    ];
    sendSmtpEmail.replyTo = { 'email': 'notification@formundzeichen.at', 'name': 'SEO Notification' };
    // sendSmtpEmail.headers = { 'Some-Custom-Name': 'unique-id-1234' };
    sendSmtpEmail.params = {
        'heading': title,
        'message': message,
        'subject': 'Neue Benachrichtigung',
        'appDomain': process.env.NEXT_PUBLIC_API_DOMAIN,
        'domain': domain
    };

    apiInstance.sendTransacEmail(sendSmtpEmail).then(function (data: any) {
        console.log('API called successfully. Returned data: ' + JSON.stringify(data));
    }, function (error: any) {
        console.error(error);
    });
}