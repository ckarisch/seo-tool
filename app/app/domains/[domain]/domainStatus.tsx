"use client";

import Link from "next/link";
import styles from "./domainStatus.module.scss";
import { useSession } from "next-auth/react";
import { Dispatch, useEffect, useState } from "react";
import { revalidateTag } from "next/cache";
import { Domain, defaultDomainState } from "@/interfaces/domain"
import Card from "@/components/layout/card";
import { fetchData } from "@/util/client/fetchData";
import Section from "@/components/layout/section";
import { defaultUserState } from "@/interfaces/user";
import { Loading } from "@/icons/loading";
import { Check } from "@/icons/checkmark";
import { Cross } from "@/icons/cross";
import { Warning } from "@/icons/warningAnimated";

export default function DomainStatus({ params, domainFetchTag, linksFetchTag }: { params: { domain: string }, domainFetchTag: string, linksFetchTag: string }) {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            // The user is not authenticated, handle it here.
        },
    });

    const [domainJson, setDomainJson] = useState(defaultDomainState);
    const [apiUser, setApiUser] = useState(defaultUserState);
    const [crawlStatus, setcrawlStatus] = useState('idle');
    const noCrawling = domainJson.crawlStatus !== 'crawling' && crawlStatus !== 'crawling';
    const noLoading = status !== 'loading' && domainJson.id && domainJson.id !== '-1';

    useEffect(() => {
        console.log('status', status);
        if (status !== "loading") {
            fetchData('api/user/', 'api/user/', setApiUser, null);
            fetchData('api/seo/domains/' + params.domain, domainFetchTag, setDomainJson, null);
        }
    }, [status]);

    useEffect(() => {
        console.log('domainJson.crawlStatus', domainJson.crawlStatus);
    }, [domainJson.crawlStatus]);


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
            console.log('refetch');
        }, 5000);

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

    if (apiUser.role !== 'admin' && !domainJson.domainVerified && !['loading', 'authenticated'].includes(status)) {
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

    if (!domainJson || !domainJson.id) {
        return (
            <div>
                <Card>
                    <div className={styles.domainStatus}>
                        <div className={[styles.domainData, styles.idle].join(' ')}>Fehler</div>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div>
            <Card className={styles.domainCard}>
                <div className={[styles.domainIcon].join(' ')}>

                    {
                        noCrawling && noLoading && domainJson.error &&
                        <div title={'crawl error'}>
                            <Cross />
                        </div>
                    }
                    {
                        noCrawling && noLoading && domainJson.warning &&
                        <div title={'crawl error'}>
                            <Warning />
                        </div>
                    }

                    {/* {domainJson.error &&
                        <div className={[styles.crawlError].join(' ')}>
                            Crawling Error: {[domainJson.error404 ? '404' : null, domainJson.error503 ? '503' : null].join(', ')}
                        </div>
                    } */}

                    {
                        noCrawling && noLoading &&
                        !domainJson.error && !domainJson.warning &&
                        domainJson.crawlStatus == 'idle' &&
                        <div title={'status ok'}>
                            <Check />
                        </div>
                    }
                    {!domainJson.error && !domainJson.warning &&
                        !noCrawling && noLoading &&
                        <div title={'crawling'}>
                            <Loading />
                        </div>
                    }
                </div>

                <div className={styles.domainStatus}>
                    <div className={styles.domainInfos}>
                        <div className={styles.domainInfo}>Crawl interval: {domainJson.crawlInterval}</div>
                        <div className={styles.domainInfo}>Crawl depth: {domainJson.crawlDepth}</div>
                        <div className={styles.domainInfo}>Crawl enabled: {domainJson.crawlEnabled ? 'yes' : 'no'}</div>
                        <div className={styles.domainInfo}>Last Crawltime: {domainJson.lastCrawlTime}</div>
                    </div>
                    {/* <div className={styles.domainCrawlErrors}>
                        <div className={styles.domainCrawlError}>{domainJson.lastErrorType ? 'Last error: ' + domainJson.lastErrorType : ''}</div>
                        <div className={styles.domainCrawlError}>{domainJson.lastErrorTime ? ' at ' + (new Date(domainJson.lastErrorTime).toLocaleDateString() + ' ' + new Date(domainJson.lastErrorTime).toLocaleTimeString()) : ''}</div>
                        <div className={styles.domainCrawlError}>{domainJson.lastErrorMessage ? '(' + domainJson.lastErrorMessage + ')' : ''}</div>
                    </div> */}

                </div>


                <div className={styles.domainActions}>
                    <h2>Actions</h2>
                    <div className={styles.domainActionButtons}>
                        <form onSubmit={handleCrawl}>
                            <button className={styles.crawlButton} type="submit" disabled={domainJson.crawlStatus === 'crawling' || crawlStatus === 'crawling'}>request crawl</button>
                        </form>
                        <form onSubmit={handleResetLinks}>
                            <button className={styles.crawlButton} type="submit" disabled={domainJson.crawlStatus === 'crawling' || crawlStatus === 'crawling'}>reset links</button>
                        </form>
                    </div>
                </div>
            </Card>
        </div>
    );
}