"use client";

import Link from "next/link";
import styles from "./page.module.scss";
import { useSession } from "next-auth/react";
import { Dispatch, useEffect, useState } from "react";
import { revalidateTag } from "next/cache";
import { Domain, defaultDomainState } from "@/interfaces/domain"
import Card from "@/components/layout/card";
import { fetchData } from "@/util/client/fetchData";
import Section from "@/components/layout/section";
import { defaultUserState } from "@/interfaces/user";

export default function DomainStatus({ params, domainFetchTag, linksFetchTag, setLinksJson }: { params: { domain: string }, domainFetchTag: string, linksFetchTag: string, setLinksJson: Function }) {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            // The user is not authenticated, handle it here.
        },
    });

    const [domainJson, setDomainJson] = useState(defaultDomainState);
    const [apiUser, setApiUser] = useState(defaultUserState);
    const [crawlStatus, setcrawlStatus] = useState('idle');

    useEffect(() => {
        if (status !== "loading") {
            fetchData('api/user/', 'api/user/', setApiUser, null);
            fetchData('api/seo/domains/' + params.domain, domainFetchTag, setDomainJson, null);
        }
    }, [status]);


    const handleCrawl = async (event: any) => {
        event.preventDefault();
        const endpoint = process.env.NEXT_PUBLIC_API_DOMAIN + '/api/seo/domains/' + params.domain + '/crawl';

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credetials: 'include',
        }

        // fetch after timeout when crawling started
        setTimeout(async () => {
            await fetchData('api/seo/domains/' + params.domain, domainFetchTag, setDomainJson, null);
        }, 3000);

        setcrawlStatus('crawling');
        const response = await fetch(endpoint, options);
        const jsonData = await response.json();
        setcrawlStatus('idle');

        // fetch after crawling finished
        await fetchData('api/seo/domains/' + params.domain, domainFetchTag, setDomainJson, null);
        // await fetchData(params.domain, linksFetchTag, setLinksJson);

        return jsonData;
    };

    const handleResetLinks = async (event: any) => {
        event.preventDefault();
        setcrawlStatus('crawling');
        if (!confirm('do you really want to reset all links?')) {
            return false;
        }
        const endpoint = process.env.NEXT_PUBLIC_API_DOMAIN + '/api/seo/domains/' + params.domain + '/links';

        const options = {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        }

        const response = await fetch(endpoint, options);
        const jsonData = await response.json();
        setcrawlStatus('idle');

        // fetch after crawling finished
        await fetchData('api/seo/domains/' + params.domain, domainFetchTag, setDomainJson, null);

        return jsonData;
    };


    const handleSetCrawlEnalbed = async (event: any, value: boolean) => {
        event.preventDefault();
        const endpoint = process.env.NEXT_PUBLIC_API_DOMAIN + '/api/seo/domains/' + params.domain + '/settings/crawlEnabled';

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credetials: 'include',
            body: JSON.stringify({ value: value })
        }

        const response = await fetch(endpoint, options);
        const jsonData = await response.json();

        // fetch after crawling finished
        await fetchData('api/seo/domains/' + params.domain, domainFetchTag, setDomainJson, null);

        return jsonData;
    };

    if (apiUser.role !== 'admin' && !domainJson.domainVerified) {
        return (
            <div>
                <Card>
                    <div className={styles.domainStatus}>
                        <div className={[styles.domainData, styles.idle].join(' ')}>Domain not verified</div>
                    </div>
                </Card>
            </div>
        )
    }

    if (status === "loading" || !domainJson || !domainJson.id) {
        return (
            <div>
                <div className={[styles.domainData, domainJson.crawlStatus === 'crawling' ? styles.crawling : styles.idle].join(' ')}>Crawling status: {domainJson.crawlStatus}</div>
                {domainJson.error &&
                    <div className={[styles.crawlError].join(' ')}>
                        Crawling Error: {[domainJson.error404 ? '404' : null, domainJson.error503 ? '503' : null].join(', ')}
                    </div>
                }
                {domainJson.warning &&
                    <div className={[styles.crawlWarning].join(' ')}>
                        Crawling Warning
                    </div>
                }
                <Card>
                    <div className={styles.domainStatus}>
                        <div className={[styles.domainData, styles.idle].join(' ')}>Crawling status: {'loading'}</div>
                        <div className={styles.domainData}>
                            <form onSubmit={handleCrawl}>
                                <button type="submit" disabled={true}>request crawl</button>
                            </form>
                            <form onSubmit={($e) => handleSetCrawlEnalbed($e, !domainJson.crawlEnabled)}>
                                <button className={[styles.setCrawlEnabledButton, domainJson.crawlEnabled ? styles.crawlEnabled : styles.crawlDisabled].join(' ')} type="submit" disabled={true}>{domainJson.crawlEnabled ? 'disable crawling' : 'enable crawling'}</button>
                            </form>
                        </div>
                        <div className={styles.domainData}>
                            Errors:
                            <div></div>
                            <div></div>
                            <div></div>
                        </div>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div>
            <Section>
                <div className={[styles.domainData, domainJson.crawlStatus === 'crawling' ? styles.crawling : styles.idle].join(' ')}>Crawling status: {domainJson.crawlStatus}</div>
                {domainJson.error &&
                    <div className={[styles.crawlError].join(' ')}>
                        Crawling Error: {[domainJson.error404 ? '404' : null, domainJson.error503 ? '503' : null].join(', ')}
                    </div>
                }
                {domainJson.warning &&
                    <div className={[styles.crawlWarning].join(' ')}>
                        Crawling Warning
                    </div>
                }
            </Section>
            <Card>
                <div className={styles.domainStatus}>
                    <div className={styles.domainData}>
                        <form onSubmit={handleCrawl}>
                            <button className={styles.crawlButton} type="submit" disabled={domainJson.crawlStatus === 'crawling' || crawlStatus === 'crawling'}>request crawl</button>
                        </form>
                        <form onSubmit={handleResetLinks}>
                            <button className={styles.crawlButton} type="submit" disabled={domainJson.crawlStatus === 'crawling' || crawlStatus === 'crawling'}>reset links</button>
                        </form>
                        <form onSubmit={($e) => handleSetCrawlEnalbed($e, !domainJson.crawlEnabled)}>
                            <button className={[styles.setCrawlEnabledButton, domainJson.crawlEnabled ? styles.crawlEnabled : styles.crawlDisabled].join(' ')} type="submit">{domainJson.crawlEnabled ? 'disable crawling' : 'enable crawling'}</button>
                        </form>
                    </div>
                </div>

                <div className={styles.domainInfos}>
                    <div className={styles.domainInfo}>Crawl interval: {domainJson.crawlInterval}</div>
                    <div className={styles.domainInfo}>Crawl depth: {domainJson.crawlDepth}</div>
                    <div className={styles.domainInfo}>Crawl enabled: {domainJson.crawlEnabled ? 'yes' : 'no'}</div>
                    <div className={styles.domainInfo}>Last Crawltime: {domainJson.lastCrawlTime}</div>
                </div>
                <div className={styles.domainCrawlErrors}>
                    <div className={styles.domainCrawlError}>{domainJson.lastErrorType ? 'Last error: ' + domainJson.lastErrorType : ''}</div>
                    <div className={styles.domainCrawlError}>{domainJson.lastErrorTime ? ' at ' + (new Date(domainJson.lastErrorTime).toLocaleDateString() + ' ' + new Date(domainJson.lastErrorTime).toLocaleTimeString()) : ''}</div>
                    <div className={styles.domainCrawlError}>{domainJson.lastErrorMessage ? '(' + domainJson.lastErrorMessage + ')' : ''}</div>
                </div>
            </Card>
        </div>
    );
}