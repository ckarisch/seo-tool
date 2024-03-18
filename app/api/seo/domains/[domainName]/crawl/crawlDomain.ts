import { PrismaClient } from "@prisma/client";

import axios, { AxiosError } from 'axios';
import cheerio from 'cheerio';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

const pushLink = async (href: string, domainId: string) => {
    const link = await prisma.internalLink.findFirst({ where: { path: href, domainId } });
    if (!link && href) {
        await prisma.internalLink.create({
            data: {
                path: href,
                domain: {
                    connect: {
                        id: domainId
                    }
                },
                lastCheck: new Date(),
                lastLoadTime: 0,
            }
        });
    }
    else {
        if (link && href) {
            await prisma.internalLink.update({
                where: { id: link.id },
                data: {
                    lastCheck: new Date(),
                }
            });
        }
    }
}

const pushExternalLink = async (href: string, domainId: string) => {
    const link = await prisma.externalLink.findFirst({ where: { url: href, domainId } });
    if (!link && href) {
        await prisma.externalLink.create({
            data: {
                url: href,
                domain: {
                    connect: {
                        id: domainId
                    }
                },
                lastCheck: new Date(),
            }
        });
    }
    else {
        if (link && href) {
            await prisma.externalLink.update({
                where: { id: link.id },
                data: {
                    lastCheck: new Date(),
                }
            });
        }
    }
}


export const crawlDomain = async (url: string, depth: number, followLinks: boolean): Promise<Response> => {
    const seconds = 30;
    const domain = await prisma.domain.findFirst({ where: { domainName: url } });

    if (!domain) {
        return Response.json({ error: 'domain not found' }, { status: 404 })
    }

    const targetURL = 'https://' + url; // URL of the website you want to crawl

    if (domain.crawlStatus === 'crawling') {
        console.log('domain currently crawling: ' + (new Date().getTime() - (domain.lastCrawl?.getTime() ?? 0)));
        return Response.json({ error: 'domain currently crawling' }, { status: 500 })
    }

    if (domain.lastCrawl && (new Date().getTime() - (domain.lastCrawl?.getTime() ?? 0)) < 1000 * seconds) {
        console.log('Crawling too soon: ' + (new Date().getTime() - (domain.lastCrawl?.getTime() ?? 0)));
        return Response.json({ error: 'crawling too soon' }, { status: 500 })
    }

    const domainCrawl = await prisma.domainCrawl.create({
        data: {
            domain: {
                connect: {
                    id: domain.id
                }
            },
            startTime: new Date(),
            status: 'crawling',
            error: false
        }
    });

    await prisma.domain.update({
        where: { id: domain.id },
        data: {
            lastCrawl: new Date(),
            crawlStatus: 'crawling'
        }
    });

    try {
        console.time("Execution Time");
        // Fetch the HTML content from the target URL
        const { data } = await axios.get(targetURL);

        if(!followLinks){
            await prisma.domainCrawl.update({
                where: { id: domainCrawl.id },
                data: {
                    status: 'done',
                    error: false,
                    endTime: new Date()
                }
            });
            await prisma.domain.update({
                where: { id: domain.id },
                data: {
                    crawlStatus: 'idle'
                }
            });
            return NextResponse.json({ links: [] }, { status: 200 })
        }

        // Load HTML into cheerio
        const $ = cheerio.load(data);

        // Extract data using cheerio (links)
        const links: (string | undefined)[] = [];
        const externalLinks: (string | undefined)[] = [];
        const crawledLinks: (string)[] = ['/'];
        const aElements = $('a').toArray();


        for (let element of aElements) {
            const href = $(element).attr('href');
            if (href) {
                if (href.startsWith('/')) {
                    links.push(href);
                    await pushLink(href, domain.id);
                }
                else {
                    externalLinks.push(href);
                    await pushExternalLink(href, domain.id);
                }
            }

        }

        console.log('Crawling: ' + targetURL);

        const addSlash = targetURL.endsWith('/') ? '' : '/';

        for (let j = 0; j < depth; j++) {
            for (let i = 0; i < links.length; i++) {
                if (links[i] && links[i]?.startsWith('/') && !crawledLinks.includes(links[i]!)) { // Check if the link is defined
                    console.log('Crawling: ' + links[i]!);

                    crawledLinks.push(links[i]!); // Use the non-null assertion operator
                    const { data } = await axios.get(targetURL + addSlash + links[i]!); // Use the non-null assertion operator
                    const $ = cheerio.load(data);
                    const aElements = $('a').toArray();

                    for (let element of aElements) {
                        const href = $(element).attr('href');
                        if (href) {
                            if (href.startsWith('/')) {
                                links.push(href);
                                await pushLink(href, domain.id);
                            }
                            else {
                                externalLinks.push(href);
                                await pushExternalLink(href, domain.id);
                            }
                        }
                    }
                }
            }
        }


        await prisma.domainCrawl.update({
            where: { id: domainCrawl.id },
            data: {
                status: 'done',
                error: false,
                endTime: new Date()
            }
        });

        console.timeEnd("Execution Time");

        // Send the extracted data as a response
        return NextResponse.json({ links }, { status: 200 })

    } catch (error: AxiosError | TypeError | any) {
        // Handle any errors
        console.log(error);

        if (error instanceof AxiosError) {
            console.log('set axios update')
            await prisma.domain.update({
                where: { id: domain.id },
                data: {
                    crawlStatus: 'idle',
                    lastErrorTime: new Date(),
                    lastErrorType: error.code ? error.code : error.name,
                    lastErrorMessage: error.cause?.message
                }
            });

            await prisma.domainCrawl.update({
                where: { id: domainCrawl.id },
                data: {
                    status: 'error',
                    error: true,
                    endTime: new Date(),
                    errorName: error.code ? error.code : error.name,
                    errorMessage: error.cause?.message
                }
            });
        }
        else if (error instanceof TypeError) {
            console.log('set type update')
            await prisma.domain.update({
                where: { id: domain.id },
                data: {
                    crawlStatus: 'idle',
                    lastErrorTime: new Date(),
                    lastErrorType: error.name,
                    lastErrorMessage: error.message
                }
            });

            await prisma.domainCrawl.update({
                where: { id: domainCrawl.id },
                data: {
                    status: 'error',
                    error: true,
                    endTime: new Date(),
                    errorName: error.name,
                    errorMessage: error.message
                }
            });
        }
        else {
            console.log('set unknown update')
            await prisma.domain.update({
                where: { id: domain.id },
                data: {
                    crawlStatus: 'idle',
                    lastErrorTime: new Date(),
                    lastErrorType: error.name ? error.name : 'unknown',
                    lastErrorMessage: ''
                }
            });


            await prisma.domainCrawl.update({
                where: { id: domainCrawl.id },
                data: {
                    status: 'error',
                    error: true,
                    endTime: new Date(),
                    errorName: error.name ? error.name : 'unknown',
                    errorMessage: error.cause?.message
                }
            });
        }
        return Response.json({ error: 'Error fetching data' }, { status: 500 })
    }
    finally {
        await prisma.domain.update({
            where: { id: domain.id },
            data: {
                crawlStatus: 'idle'
            }
        });
    }

}