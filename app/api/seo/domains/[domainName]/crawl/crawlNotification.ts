
const brevo = require('@getbrevo/brevo');
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
var api_key = process.env.MAILGUN_SENDING_API_KEY;
var domain = process.env.MAILGUN_SENDING_DOMAIN!;
var mailgun = require('mailgun-js')({ apiKey: api_key, domain: domain });

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


export const sendNotification = (toEmail: string, toName: string, title: string, message: string, domain: string, urls: string[]) => {


    const messageHtml = '<html><body><h1>' + title + '</h1><br/><div>' + message + '</div><div>Betroffene URLs: <div>' + urls.join('<br/>') + '</div></div><br/><div><a href="' + process.env.NEXT_PUBLIC_API_DOMAIN + '/app/domains/' + domain + '">Details anzeigen</a></div></body></html>';

    var data = {
        from: 'SEO Notification <notification@formundzeichen.at>',
        to: toName + '<' + toEmail + '>',
        subject: 'Neue Benachrichtigung',
        text: messageHtml,
        html: messageHtml
    };

    mailgun.messages().send(data, function (error: any, body: any) {
        console.log(body);
    });

    // let apiInstance = new brevo.TransactionalEmailsApi();

    // let apiKey = apiInstance.authentications['apiKey'];
    // apiKey.apiKey = process.env.BREVO_API_KEY;
    // let sendSmtpEmail = new brevo.SendSmtpEmail();

    // sendSmtpEmail.subject = 'Neue Benachrichtigung';
    // sendSmtpEmail.htmlContent = '<html><body><h1>{{params.heading}}</h1><br/><div>{{params.message}}</div><div>Betroffene URLs: <div>' + urls.join('<br/>') + '</div></div><br/><div><a href="{{params.appDomain}}/app/domains/{{params.domain}}">Details anzeigen</a></div></body></html>';
    // sendSmtpEmail.sender = { 'name': 'SEO Notification', 'email': 'notification@formundzeichen.at' };
    // sendSmtpEmail.to = [
    //     { 'email': toEmail, 'name': toName }
    // ];
    // sendSmtpEmail.replyTo = { 'email': 'notification@formundzeichen.at', 'name': 'SEO Notification' };
    // // sendSmtpEmail.headers = { 'Some-Custom-Name': 'unique-id-1234' };
    // sendSmtpEmail.params = {
    //     'heading': title,
    //     'message': message,
    //     'subject': 'Neue Benachrichtigung',
    //     'appDomain': process.env.NEXT_PUBLIC_API_DOMAIN,
    //     'domain': domain
    // };

    // apiInstance.sendTransacEmail(sendSmtpEmail).then(function (data: any) {
    //     console.log('notification sent')
    //     // console.log('API called successfully. Returned data: ' + JSON.stringify(data));
    // }, function (error: any) {
    //     console.error(error);
    // });
}