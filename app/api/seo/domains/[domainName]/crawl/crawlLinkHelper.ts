import { Prisma, PrismaClient } from "@prisma/client";
import { JsonObject } from "@prisma/client/runtime/library";

export enum linkType {
    anchor,
    page
}

export const createPushLinkInput = (foundOnPath: string, href: string, warningDoubleSlash: boolean, domainId: string, type: linkType, requestTime: number, errorCode: errorTypes | null): Prisma.InternalLinkUpsertArgs => {
    return {
        create: {
            foundOnPath,
            path: href,
            domain: {
                connect: {
                    id: domainId
                }
            },
            lastCheck: new Date(),
            lastLoadTime: requestTime,
            type: linkType[type],
            errorCode,
            warningDoubleSlash
        },
        update: {
            foundOnPath,
            lastCheck: new Date(),
            lastLoadTime: requestTime,
            type: linkType[type],
            errorCode,
            warningDoubleSlash
        },
        where: { domainId_path: { domainId, path: href } }
    }
}

export const pushLink = (prisma: PrismaClient, foundOnPath: string, href: string, warningDoubleSlash: boolean, domainId: string, type: linkType, requestTime: number, errorCode: errorTypes | null) => {
    const args = createPushLinkInput(foundOnPath, href, warningDoubleSlash, domainId, type, requestTime, errorCode);
    return prisma.internalLink.upsert(args);
}

export const pushAllLinks = (prisma: PrismaClient, internalLinkUpsertArgs: Prisma.InternalLinkUpsertArgs[]): Prisma.PrismaPromise<JsonObject>[] => {
    const promises: any = [];
    internalLinkUpsertArgs.map(a => (promises.push(prisma.internalLink.upsert(a))));
    return promises;
}

export const pushExternalLink = (prisma: PrismaClient, foundOnPath: string, href: string, domainId: string) => {
    return prisma.externalLink.upsert({
        create: {
            foundOnPath,
            url: href,
            domain: {
                connect: {
                    id: domainId
                }
            },
            lastCheck: new Date(),
        },
        update: {
            foundOnPath,
            lastCheck: new Date(),
        },
        where: { domainId_url: { domainId, url: href } }
    });
}

export const checkTimeoutAndPush = async (prisma: PrismaClient, timePassed: number, maxCrawlTime: number, domainCrawlId: string, domainId: string) => {
    if (checkTimeout(timePassed, maxCrawlTime)) {
        await prisma.domainCrawl.update({
            where: { id: domainCrawlId },
            data: {
                status: 'error',
                error: true,
                endTime: new Date(),
                errorName: 'timeout',
                errorMessage: 'the server did not respond within the time limit'
            }
        });

        await prisma.domain.update({
            where: { id: domainId },
            data: {
                crawlStatus: 'idle'
            }
        });

        return true;
    }
    return false;
}

export const checkTimeout = (timePassed: number, maxDuration: number) => {
    if (timePassed + 500 > maxDuration) {
        return true;
    }
    return false;
}

export const checkRequests = (requests: number, maxRequests: number) => {
    return requests >= maxRequests;
}

export interface Link {
    foundOnPath: string,
    path: string
}

export interface linkErros {
    err_404: boolean,
    err_503: boolean
}

export enum errorTypes {
    err_503 = 503,
    err_404 = 404
}

export const getStrongestErrorCode = (errors: linkErros): errorTypes | null => {
    if (errors.err_503) {
        return errorTypes.err_503;
    }
    if (errors.err_404) {
        return errorTypes.err_404;
    }
    return null;
}