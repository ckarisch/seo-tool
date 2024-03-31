export interface Domain {
    id: string,
    name: string,
    domainName: string,
    warning: boolean,
    error: boolean,
    // error states
    error404: boolean,
    error404NotificationDisabled: boolean,
    error404NotificationDisabledUntil: Date,
    error503: boolean,
    error503NotificationDisabled: boolean,
    error503NotificationDisabledUntil: Date,
    crawlEnabled: boolean,
    crawlStatus: string,
    crawlInterval: number,
    crawlDepth: number,
    lastCrawlTime: number,
    lastErrorType: string,
    lastErrorTime: Date,
    lastErrorMessage: string,
    score: number
}