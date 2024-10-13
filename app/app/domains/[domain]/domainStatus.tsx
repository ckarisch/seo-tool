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
import { formatDate } from "date-fns";
import { Alert, AlertDescription } from "@/components/layout/alert/Alert";
import { AlertCircle } from "lucide-react";
import DomainActions from "./domainActions";

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

    const icons = () => {
        if (noCrawling && noLoading && domainJson.error) {
            return <div title={'crawl error'}>
                <Cross />
            </div>
        }
        else if (noCrawling && noLoading && domainJson.warning) {
            return <div title={'crawl error'}>
                <Warning />
            </div>
        }


        else if (noCrawling && noLoading && !domainJson.error && !domainJson.warning &&
            domainJson.crawlStatus == 'idle') {

            <div title={'status ok'}>
                <Check />
            </div>
        }
        else if (!domainJson.error && !domainJson.warning && !noCrawling && noLoading) {
            <div title={'crawling'}>
                <Loading />
            </div>
        }
    }

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
                    {icons()}
                </div>

                <div className={styles.domainStatus}>
                    <h2 className={styles.title}>Domain Status</h2>
                    <div className={styles.infoContainer}>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>Crawl enabled:</span>
                            <span className={domainJson.crawlEnabled ? styles.enabled : styles.disabled}>
                                {domainJson.crawlEnabled ? 'Yes' : 'No'}
                            </span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>Last Crawl Time:</span>
                            <span>{domainJson.lastCrawlTime}ms</span>
                        </div>
                    </div>
                    {domainJson.error503 && (
                        <Alert variant="destructive" className={styles.alert}>
                            <AlertCircle className={styles.alertIcon} />
                            <AlertDescription>503 errors detected</AlertDescription>
                        </Alert>
                    )}
                    {domainJson.error404 && (
                        <Alert variant="destructive" className={styles.alert}>
                            <AlertCircle className={styles.alertIcon} />
                            <AlertDescription>404 errors detected</AlertDescription>
                        </Alert>
                    )}
                </div>
            </Card>

            <DomainActions crawlStatus={crawlStatus} domainJson={domainJson} handleCrawl={handleCrawl} handleResetLinks={handleResetLinks} />

        </div>
    );
}