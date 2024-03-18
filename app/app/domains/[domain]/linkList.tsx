"use client";

import styles from "./page.module.scss";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import DomainStatus from "./domainStatus";

const dummyLinks = [
    { path: 'Loading', lastCheck: 'loading', lastLoadTime: 'loading' }
]

const dummyExternalLinks = [
    { url: 'Loading', lastCheck: 'loading', lastLoadTime: 'loading' }
]

export default function LinkList({ params, linksFetchTag, domainFetchTag }: { params: { domain: string }, linksFetchTag: string, domainFetchTag: string}) {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            // The user is not authenticated, handle it here.
        },
    });

    const [linksJson, setLinksJson] = useState({ links: [], externalLinks: [], loaded: false, crawlingStatus: '', lastErrorType: '', lastErrorTime: '', lastErrorMessage: ''});

    useEffect(() => {
        if (status !== "loading") {
            fetch(process.env.API_DOMAIN + '/api/seo/domains/' + params.domain + '/links',
                { next: { tags: [linksFetchTag], revalidate: false } })
                .then(res => res.json())
                .then(data => setLinksJson(data));
        }
    }, [status]);


    if (status === "loading" || !linksJson || !linksJson.loaded || !linksJson.links) {
        return (
            <div className={styles.linksList}>
                <h2>Links</h2>
                <div className={styles.links}>
                    {dummyLinks.map((link: any, index: number) => {
                        return <div key={index}>
                            <div className={styles.linkInner}>
                                {link.path}, {link.lastCheck}, {link.lastLoadTime}
                            </div>
                        </div>
                    })}
                </div>

                <br />

                <h2>External Links</h2>
                <div className={styles.externalLinks}>
                    {dummyExternalLinks.map((link: any, index: number) => {
                        return <div key={index}>

                            <div className={styles.externalLinkInner}>
                                {link.url}, {link.lastCheck}, {link.lastLoadTime}
                            </div>
                        </div>
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className={styles.linksList}>

            <DomainStatus params={params} domainFetchTag={domainFetchTag} />

            <h2>Links</h2>
            <div className={styles.links}>
                {linksJson.links.map((link: any, index: number) => {
                    return <div key={index}>
                        <div className={styles.linkInner}>
                            {link.path}, {link.lastCheck}, {link.lastLoadTime}
                        </div>
                    </div>
                })}
            </div>

            <br />

            <h2>External Links</h2>
            <div className={styles.externalLinks}>
                {linksJson.externalLinks && linksJson.externalLinks.map((link: any, index: number) => {
                    return <div key={index}>

                        <div className={styles.externalLinkInner}>
                            {link.url}, {link.lastCheck}, {link.lastLoadTime}
                        </div>
                    </div>
                })}
            </div>
        </div>
    );
}