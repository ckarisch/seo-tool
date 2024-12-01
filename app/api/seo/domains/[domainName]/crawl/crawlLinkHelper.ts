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

export const pushAllLinks = async (
    prisma: PrismaClient,
    internalLinkUpsertArgs: Prisma.InternalLinkUpsertArgs[]
): Promise<JsonObject[]> => {
    const batchSize = 5;
    const chunks = Array.from(
        { length: Math.ceil(internalLinkUpsertArgs.length / batchSize) },
        (_, i) => internalLinkUpsertArgs.slice(i * batchSize, (i + 1) * batchSize)
    );

    const results: JsonObject[] = [];

    for (const chunk of chunks) {
        try {
            const batchResults = await Promise.all(
                chunk.map(args =>
                    prisma.internalLink.upsert(args)
                        .catch(error => {
                            if (error.code === 'P2034') {
                                // Add small delay and retry once on conflict
                                return new Promise(resolve =>
                                    setTimeout(() => resolve(prisma.internalLink.upsert(args)), 100)
                                );
                            }
                            throw error;
                        })
                )
            );
            results.push(...(batchResults as JsonObject[]));
        } catch (error) {
            console.error('Error processing batch:', error);
            throw error;
        }
    }

    return results;
};

export const pushExternalLinks = async (prisma: PrismaClient, links: { foundOnPath: string, href: string }[], domainId: string) => {
    // Create the upsert operations for all links
    const upsertOperations = links.map(link => {
        return prisma.externalLink.upsert({
            create: {
                foundOnPath: link.foundOnPath,
                url: link.href,
                domain: {
                    connect: {
                        id: domainId
                    }
                },
                lastCheck: new Date(),
            },
            update: {
                foundOnPath: link.foundOnPath,
                lastCheck: new Date(),
            },
            where: {
                domainId_url: {
                    domainId,
                    url: link.href
                }
            }
        });
    });

    // Execute all upsert operations in a single transaction
    return prisma.$transaction(upsertOperations);
};

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
    if (timePassed + 1500 > maxDuration) {
        return true;
    }
    return false;
}

export const checkRequests = (requests: number, maxRequests: number) => {
    return requests >= maxRequests;
}

export interface Link {
    foundOnPath: string,
    path: string,
    ignoreCanonical: boolean
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