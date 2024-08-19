"use client";

import styles from "./crawlRequestPublic.module.scss";
import { useState } from "react";

interface publicCrawlResponse {
    error: boolean,
    error404Occured: boolean,
    error503Occured: boolean,
    warning: boolean,
    warningDoubleSlashOccured: boolean,
    errorTimeoutOccured: boolean,
    errorTooManyLinksOccured: boolean
}


export default function CrawlRequestPublic() {

    const [domainInput, setDomainInput] = useState('');

    const handleInputChange = (event: any) => {
        setDomainInput(event.target.value);
    };

    const [crawlStatus, setcrawlStatus] = useState('idle');
    const [crawlResponse, setCrawlResponse] = useState<publicCrawlResponse>();

    const handleCrawl = async (event: any) => {
        event.preventDefault();
        const endpoint = process.env.NEXT_PUBLIC_API_DOMAIN + '/api/public/domain/' + domainInput + '/crawl';

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        }

        console.log('crawl: ', endpoint);

        setcrawlStatus('crawling');
        const response = await fetch(endpoint, options);
        let jsonData: publicCrawlResponse;
        jsonData = await response.json();
        setCrawlResponse(jsonData);
        setcrawlStatus('idle');

        console.log(jsonData);

        return jsonData;
    };

    return (
        <>
            <input className={styles.input}
                type="text"
                placeholder="www.example.com"
                onChange={handleInputChange} />
            <form onSubmit={handleCrawl}>
                <button className={styles.checkButton} type="submit" disabled={crawlStatus === 'crawling'}>check</button>
            </form>
            {crawlStatus !== 'crawling' ?
                <div>
                    {crawlResponse?.error ? <div>
                    </div> : <div>no errors</div>}
                    {crawlResponse?.warning ? <div>warning</div> : <div>no warnings</div>}
                    <div className={styles.errors}>
                        {
                            crawlResponse?.error404Occured ?
                                <div className={styles.error}>
                                    404 errors detected
                                </div>
                                : null
                        }
                        {
                            crawlResponse?.errorTooManyLinksOccured ?
                                <div className={styles.error}>
                                    too many links
                                </div>
                                : null
                        }
                        {
                            crawlResponse?.errorTimeoutOccured ?
                                <div className={styles.error}>
                                    timeout occured
                                </div>
                                : null
                        }
                    </div>
                    <div className={styles.warnings}>
                        {
                            crawlResponse?.warningDoubleSlashOccured ?
                                <div className={styles.error}>
                                    incorrect urls
                                </div>
                                : null
                        }
                    </div>
                </div>
                : null
            }
        </>
    );
}