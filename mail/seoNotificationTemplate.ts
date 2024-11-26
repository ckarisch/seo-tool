export const seoNotificationTemplate = () => `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SEO Notification</title>
    <style>
        /* Reset styles for email clients */
        body, table, td, div, p, a {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        /* Base styles */
        body {
            width: 100% !important;
            height: 100% !important;
            margin: 0;
            padding: 0;
            background-color: #f8f9fa;
        }

        /* Container */
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        /* Header */
        .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 1px solid #e9ecef;
        }

        .logo {
            width: 120px;
            height: auto;
            margin-bottom: 15px;
        }

        /* Content */
        .content {
            padding: 30px 0;
        }

        .notification-card {
            margin-bottom: 20px;
            padding: 15px;
            border-radius: 6px;
            background-color: #f8f9fa;
            border-left: 4px solid #0d6efd;
        }

        .notification-card.error {
            border-left-color: #dc3545;
            background-color: #fff5f5;
        }

        .notification-card.warning {
            border-left-color: #ffc107;
            background-color: #fff9e6;
        }

        .notification-card.success {
            border-left-color: #198754;
            background-color: #f0fff4;
        }

        /* Typography */
        h1 {
            color: #212529;
            font-size: 24px;
            margin-bottom: 15px;
        }

        h2 {
            color: #495057;
            font-size: 20px;
            margin-bottom: 10px;
        }

        p {
            color: #6c757d;
            font-size: 16px;
            line-height: 1.5;
            margin-bottom: 15px;
        }

        /* Links */
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #0d6efd;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 4px;
            font-weight: 500;
            margin-top: 15px;
            transition: background-color 0.3s ease;
        }

        .button:hover {
            background-color: #0b5ed7;
        }

        /* URLs list */
        .urls-list {
            margin: 15px 0;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 4px;
        }

        .urls-list li {
            margin: 5px 0;
            word-break: break-all;
        }

        /* Footer */
        .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 14px;
        }

        /* Animations */
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .animate {
            animation: slideIn 0.5s ease-out forwards;
        }

        /* Responsive */
        @media screen and (max-width: 600px) {
            .email-container {
                padding: 10px;
            }

            h1 {
                font-size: 20px;
            }

            h2 {
                font-size: 18px;
            }

            p {
                font-size: 14px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header animate">
            <img src="https://www.rankidang.com/logo.png" alt="Rankidang" class="logo">
            <h1>SEO Notification Summary</h1>
        </div>
        
        <div class="content">
            {{#each notifications}}
            <div class="notification-card {{type}} animate" style="animation-delay: {{multiply @index 0.1}}s">
                <h2>{{title}}</h2>
                <p>{{{message}}}</p>
                {{#if urls}}
                <div class="urls-list">
                    <strong>Affected URLs:</strong>
                    <ul>
                        {{#each urls}}
                        <li>{{this}}</li>
                        {{/each}}
                    </ul>
                </div>
                {{/if}}
            </div>
            {{/each}}
            
            <a href="{{dashboardUrl}}" class="button animate">
                View Details in Dashboard
            </a>
        </div>

        <div class="footer animate">
            <p>This is an automated message from your SEO monitoring tool.</p>
            <p>© {{currentYear}} SEO Tool. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`