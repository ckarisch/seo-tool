"use client";

import Link from "next/link";
import styles from "./page.module.scss";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { revalidateTag } from "next/cache";

const fetchData = async (domain: string, domainFetchTag: string, setLinksJson: Function) => {
    return fetch(process.env.NEXT_PUBLIC_API_DOMAIN + '/api/seo/domains/' + domain,
        { next: { tags: [domainFetchTag] } })
        .then(res => res.json())
        .then(data => setLinksJson(data));
}

export default function DomainStatus({ params, domainFetchTag }: { params: { domain: string }, domainFetchTag: string }) {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            // The user is not authenticated, handle it here.
        },
    });

    const [linksJson, setLinksJson] = useState({ loaded: false, crawlStatus: '', lastErrorType: '', lastErrorTime: '', lastErrorMessage: '', crawlInterval: '', crawlDepth: '', crawlEnabled: false, lastCrawlTime: 0 });
    const [crawlStatus, setcrawlStatus] = useState('idle');

    useEffect(() => {
        if (status !== "loading") {
            fetchData(params.domain, domainFetchTag, setLinksJson);
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
            await fetchData(params.domain, domainFetchTag, setLinksJson);
        }, 3000);

        setcrawlStatus('crawling');
        const response = await fetch(endpoint, options);
        const jsonData = await response.json();
        setcrawlStatus('idle');

        // fetch after crawling finished
        await fetchData(params.domain, domainFetchTag, setLinksJson);

        return jsonData;
    };

    const handleResetLinks = async (event: any) => {
        event.preventDefault();
        setcrawlStatus('crawling');
        if(!confirm('do you really want to reset all links?'))
        {
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
        await fetchData(params.domain, domainFetchTag, setLinksJson);

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
        await fetchData(params.domain, domainFetchTag, setLinksJson);

        return jsonData;
    };


    if (status === "loading" || !linksJson || !linksJson.loaded) {
        return (
            <div className={styles.domainStatus}>
                <div className={[styles.domainData, styles.idle].join(' ')}>Crawling status: {'loading'}</div>
                <div className={styles.domainData}>
                    <form onSubmit={handleCrawl}>
                        <button type="submit" disabled={true}>request crawl</button>
                    </form>
                    <form onSubmit={($e) => handleSetCrawlEnalbed($e, !linksJson.crawlEnabled)}>
                        <button className={[styles.setCrawlEnabledButton, linksJson.crawlEnabled ? styles.crawlEnabled : styles.crawlDisabled].join(' ')} type="submit" disabled={true}>{linksJson.crawlEnabled ? 'disable crawling' : 'enable crawling'}</button>
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
                <div className={[styles.domainData, linksJson.crawlStatus === 'crawling' ? styles.crawling : styles.idle].join(' ')}>Crawling status: {linksJson.crawlStatus}</div>
                <div className={styles.domainData}>
                    <form onSubmit={handleCrawl}>
                        <button className={styles.crawlButton} type="submit" disabled={linksJson.crawlStatus === 'crawling' || crawlStatus === 'crawling'}>request crawl</button>
                    </form>
                    <form onSubmit={handleResetLinks}>
                        <button className={styles.crawlButton} type="submit" disabled={linksJson.crawlStatus === 'crawling' || crawlStatus === 'crawling'}>reset links</button>
                    </form>
                    <form onSubmit={($e) => handleSetCrawlEnalbed($e, !linksJson.crawlEnabled)}>
                        <button className={[styles.setCrawlEnabledButton, linksJson.crawlEnabled ? styles.crawlEnabled : styles.crawlDisabled].join(' ')} type="submit">{linksJson.crawlEnabled ? 'disable crawling' : 'enable crawling'}</button>
                    </form>
                </div>
            </div>

            <div className={styles.domainInfos}>
                <div className={styles.domainInfo}>Crawl interval: {linksJson.crawlInterval}</div>
                <div className={styles.domainInfo}>Crawl depth: {linksJson.crawlDepth}</div>
                <div className={styles.domainInfo}>Crawl enabled: {linksJson.crawlEnabled ? 'yes' : 'no'}</div>
                <div className={styles.domainInfo}>Last Crawltime: {linksJson.lastCrawlTime}</div>
            </div>
            <div className={styles.domainCrawlErrors}>
                <div className={styles.domainCrawlError}>{linksJson.lastErrorType ? 'Last error: ' + linksJson.lastErrorType : ''}</div>
                <div className={styles.domainCrawlError}>{linksJson.lastErrorTime ? ' at ' + (new Date(linksJson.lastErrorTime).toLocaleDateString() + ' ' + new Date(linksJson.lastErrorTime).toLocaleTimeString()) : ''}</div>
                <div className={styles.domainCrawlError}>{linksJson.lastErrorMessage ? '(' + linksJson.lastErrorMessage + ')' : ''}</div>
            </div>
        </div>
    );
}