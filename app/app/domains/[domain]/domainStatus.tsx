"use client";

import Link from "next/link";
import styles from "./page.module.scss";
import { useSession } from "next-auth/react";
import { Dispatch, useEffect, useState } from "react";
import { revalidateTag } from "next/cache";
import { Domain } from "@/interfaces/domain"

const defaultDomainState: Partial<Domain> = {
    id: '',
    name: "name", // Default value for name
    domainName: "domain", // Default value for domainName
    error: false,
    error404: false,
    error503: false,
    warning: false,
    crawlEnabled: false,
    crawlStatus: 'idle',
    lastCrawlTime: 0
};

const fetchData = async (domain: string, domainFetchTag: string, setDomainJson: Function | null) => {
    return fetch(process.env.NEXT_PUBLIC_API_DOMAIN + '/api/seo/domains/' + domain,
        { next: { tags: [domainFetchTag] } })
        .then(res => res.json())
        .then(data => setDomainJson && setDomainJson(data));
}

export default function DomainStatus({ params, domainFetchTag, linksFetchTag, setLinksJson }: { params: { domain: string }, domainFetchTag: string, linksFetchTag: string, setLinksJson: Function }) {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            // The user is not authenticated, handle it here.
        },
    });

    const [domainJson, setDomainJson] = useState(defaultDomainState);
    const [crawlStatus, setcrawlStatus] = useState('idle');

    useEffect(() => {
        if (status !== "loading") {
            fetchData(params.domain, domainFetchTag, setDomainJson);
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
            await fetchData(params.domain, domainFetchTag, setDomainJson);
        }, 3000);

        setcrawlStatus('crawling');
        const response = await fetch(endpoint, options);
        const jsonData = await response.json();
        setcrawlStatus('idle');

        // fetch after crawling finished
        await fetchData(params.domain, domainFetchTag, setDomainJson);
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
        await fetchData(params.domain, domainFetchTag, setDomainJson);

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
        await fetchData(params.domain, domainFetchTag, setDomainJson);

        return jsonData;
    };


    if (status === "loading" || !domainJson || !domainJson.id) {
        return (
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
        )
    }

    return (
        <div>
            <div className={styles.domainStatus}>
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
        </div>
    );
}