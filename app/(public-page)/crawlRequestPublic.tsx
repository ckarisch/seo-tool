"use client";

import { Loading } from "@/icons/loading";
import styles from "./crawlRequestPublic.module.scss";
import { useEffect, useRef, useState } from "react";
import { Check } from "@/icons/checkmark";
import { Cross } from "@/icons/cross";
import { Warning } from "@/icons/warningAnimated";
import URLInput from "@/components/layout/input/URLinput";

interface publicCrawlResponse {
    error: boolean,
    error404Occured: boolean,
    error503Occured: boolean,
    warning: boolean,
    crawlWarning: boolean,
    warningDoubleSlashOccured: boolean,
    errorTimeoutOccured: boolean,
    errorTooManyLinksOccured: boolean
}


export default function CrawlRequestPublic() {

    const [domainInput, setDomainInput] = useState('');
    const [isVisible, setIsVisible] = useState(false); // Track if content is visible
    const [height, setHeight] = useState('0px'); // Track current height
    const contentRef = useRef<HTMLDivElement | null>(null); // Reference to the element to animate


    useEffect(() => {
        if (isVisible) {
            // Calculate the full height and apply it
            if (contentRef.current) {
                setHeight(`${contentRef.current.scrollHeight}px`);
            }
            // After transition is complete, set height to 'auto' for dynamic content adjustment
            const timer = setTimeout(() => {
                setHeight('auto');
            }, 500); // Matches the CSS transition time (0.5s)

            return () => clearTimeout(timer); // Cleanup timeout on unmount
        } else {
            // Collapse the height back to 0
            setHeight('0px');
        }
    }, [isVisible]);


    const handleInputChange = (event: any) => {
        setDomainInput(event.target.value);
    };

    const [url, setUrl] = useState('');
    const [isUrlValid, setIsUrlValid] = useState(false);
    const [isError, setIsError] = useState(false);


    const [crawlStatus, setcrawlStatus] = useState('idle');
    const [crawlResponse, setCrawlResponse] = useState<publicCrawlResponse>();

    const handleCrawl = async (event: any) => {
        event.preventDefault();
        if (!isUrlValid) {
            setIsError(true);

            // Remove the shake effect after the animation is done (0.5s)
            setTimeout(() => {
                setIsError(false);
            }, 500);
            return false;
        }
        const endpoint = process.env.NEXT_PUBLIC_API_DOMAIN + '/api/public/domain/' + domainInput + '/crawl';

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        }

        console.log('crawl: ', endpoint);

        setcrawlStatus('crawling');
        setIsVisible(false);
        const response = await fetch(endpoint, options);
        let jsonData: publicCrawlResponse;
        jsonData = await response.json();
        setCrawlResponse(jsonData);
        if (!jsonData.error && !jsonData.warning) {
            setcrawlStatus('great');
        }
        else if (jsonData.error) {
            setcrawlStatus('error');
        }
        else if (jsonData.warning) {
            setcrawlStatus('warning');
        }
        else {
            setcrawlStatus('error');
        }
        setIsVisible(true);
        setIsError(false);

        console.log(jsonData);

        return jsonData;
    };

    return (
        <div className={styles.crawlRequestPublic} >
            <div>
                <form className={styles.form} onSubmit={handleCrawl}>
                    <URLInput
                        className={[styles.input, isError ? styles.shake : null].join(' ')}
                        placeholder="www.example.com"
                        onChange={handleInputChange}
                        onValidation={setIsUrlValid}
                        value={domainInput}
                    />
                    <button className={styles.checkButton} type="submit" disabled={crawlStatus === 'crawling'}>check</button>
                    {crawlStatus == 'great' && <Check />}
                    {crawlStatus == 'crawling' && <Loading />}
                    {['warning'].includes(crawlStatus) && <Warning />}
                    {!['crawling', 'great', 'idle', 'warning'].includes(crawlStatus) && <Cross />}
                </form>
            </div>
            {crawlStatus !== 'crawling' && crawlStatus !== 'idle' ?
                <div className={styles.findings}
                    ref={contentRef}
                    style={{ height, overflow: 'hidden', transition: 'height 0.5s ease' }}>
                    {crawlResponse?.error ?
                        <div className={styles.finding}>
                            <Cross width={20} height={20} />
                            <strong>
                                Errors detected: Some critical errors require attention.
                            </strong>
                            {crawlResponse?.error && <div className={[styles.finding, styles.errors].join(' ')}>
                                {
                                    crawlResponse?.error404Occured ?
                                        <div className={styles.error}>
                                            404 errors identified: Some pages are not accessible.
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
                            }
                        </div> :
                        <div className={styles.finding}>
                            <strong>
                                <Check width={26} height={26} /> <br />
                                Great!
                            </strong> There are no errors on your page. <br />
                            Sign in to analyze your whole Website and keep track of your score.
                        </div>}
                    {crawlResponse?.warning ?
                        <div className={styles.finding}>
                            <strong>
                                <Warning width={28} height={28} /> <br />
                                Warnings detected: Some issues require attention.

                            </strong>
                            <p>
                                {crawlResponse?.warning && <div className={[styles.finding, styles.warnings].join(' ')}>
                                    {
                                        crawlResponse?.warningDoubleSlashOccured ?
                                            <div className={styles.error}>
                                                URL issues detected: Some URLs appear to be incorrect.
                                            </div>
                                            : null
                                    }
                                </div>
                                }
                            </p>
                        </div> :
                        <div className={styles.finding}>
                            <strong>There are no warnings.</strong> <br />
                            We&apos;re continually enhancing our analysis to deliver even more practical recommendations. Stay tuned for new tips to help you improve your website!
                        </div>
                    }
                    {crawlResponse?.crawlWarning &&
                        <div className={styles.finding}>
                            <strong>Limited Analysis Completed</strong><br />
                            We&apos;ve performed a partial review of your website. Some tests were not executed. For a comprehensive analysis including all available tests, please register your domain with our service.
                        </div>
                    }
                </div>
                : null
            }
        </div>
    );
}