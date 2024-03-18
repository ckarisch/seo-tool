"use client";
import { format } from 'date-fns';

import styles from "./page.module.scss";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const dummyCrawls = [
    { startTime: '', endTime: '', status: 'loading', error: false, errorName: 'loading', errorMessage: 'loading' }]

const getLogTime = (crawl: { startTime: string, endTime: string, status: string, error: boolean, errorName: string, errorMessage: string }) => {
    let output = '';
    if (crawl.startTime) {
        if (crawl.endTime) {
            output = (format(crawl.startTime, 'dd.mm.yyyy HH:mm') + ' - ' + format(crawl.endTime, 'dd.mm.yyyy HH:mm'));
        }
        else {
            output = format(crawl.startTime, 'dd.mm.yyyy HH:mm');
        }
        output = output + ', ' + crawl.status;
    }
    else {
        output = '';
        return output;
    }

    if (crawl.error) {
        output = output + ', ' + crawl.errorName + ', ' + crawl.errorMessage;
    }
    return output;
}

export default function CrawlList({ params }: { params: { domain: string } }) {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            // The user is not authenticated, handle it here.
        },
    });

    const crawlsFetchTag = 'seo/domain/' + params.domain + '/crawls';

    const [crawlsJson, setCrawlsJson] = useState({ crawls: [], loaded: false, crawlingStatus: '', lastErrorType: '', lastErrorTime: '', lastErrorMessage: '' });

    useEffect(() => {
        if (status !== "loading") {
            fetch(process.env.API_DOMAIN + '/api/seo/domains/' + params.domain + '/crawls',
                { next: { tags: [crawlsFetchTag], revalidate: false } })
                .then(res => res.json())
                .then(data => setCrawlsJson(data));
        }
    }, [status]);


    if (status === "loading" || !crawlsJson || !crawlsJson.loaded || !crawlsJson.crawls) {
        return (
            <div className={styles.crawlList}>
                <h2>Logs</h2>
                <div className={styles.crawls}>
                    {dummyCrawls.map((crawl: any, index: number) => {
                        return <div key={index}>
                            <div className={styles.crawlInner}>
                                {crawl.error ?
                                    <div className={styles.error}>
                                        {getLogTime(crawl)}
                                    </div> : <div className={styles.logEntry}>
                                        {getLogTime(crawl)}
                                    </div>
                                }
                            </div>
                        </div>
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className={styles.crawlList}>
            <h2>Logs</h2>
            <div className={styles.crawls}>
                {crawlsJson.crawls.length ? crawlsJson.crawls.map((crawl: any, index: number) => {
                    return <div key={index}>
                        <div className={styles.crawlInner}>
                            {crawl.error ?
                                <div className={[styles.error, styles.logEntry].join(' ')}>
                                    {getLogTime(crawl)}
                                </div> : <div className={styles.logEntry}>
                                    {getLogTime(crawl)}
                                </div>
                            }
                        </div>
                    </div>
                }) : <div>No crawls found</div>}
            </div>
        </div>
    );
}