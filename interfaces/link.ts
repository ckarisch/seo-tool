import { ErrorLog, ErrorType, ExternalLink, InternalLink, SeoData, Severity, ImplementationStatus } from '@prisma/client';

export interface ErrorTypeWithDetails extends ErrorType {
    code: string;
    name: string;
    category: string;
    severity: Severity;
    implementation: ImplementationStatus;
}

export interface ErrorLogWithType extends ErrorLog {
    errorType: ErrorTypeWithDetails;
    metadata: any;
    occurrence: number;
    createdAt: Date;
    resolvedAt: Date | null;
}

export interface UILink extends InternalLink {
    descriptionVisible?: boolean;
    errorLogs: ErrorLogWithType[];
    seoData?: SeoData | null;
    path: string;
    lastCheck: Date;
    lastLoadTime: number;
    type: string | null;
    errorCode: number | null;
    foundOnPath: string | null;
    warningDoubleSlash: boolean | null;
}
interface UIExternalLink extends ExternalLink {
    descriptionVisible?: boolean;
}

export interface Links {
    links: UILink[],
    externalLinks: UIExternalLink[],
    loaded: boolean,
    crawlingStatus: string,
    lastErrorType: string,
    lastErrorTime: string,
    lastErrorMessage: string,
}

export const defaultLinksState: Partial<Links> = {
    links: [],
    externalLinks: [],
    loaded: false,
    crawlingStatus: '',
    lastErrorType: '',
    lastErrorTime: '',
    lastErrorMessage: ''
}