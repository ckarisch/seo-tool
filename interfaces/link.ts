import { ExternalLink, InternalLink } from "@prisma/client";

interface UILink extends InternalLink {
    descriptionVisible?: boolean;
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