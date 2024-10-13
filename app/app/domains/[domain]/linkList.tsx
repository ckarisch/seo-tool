"use client";

import styles from "./linkList.module.scss";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Section from "@/components/layout/section";
import { defaultLinksState } from "@/interfaces/link";
import { format } from "date-fns";
import { visibleDateFormat } from "@/config/config";
import MinimizableContainer from "@/components/layout/MinimizableContainer";

const dummyLinks = [
    { path: 'Loading', lastCheck: 'loading', lastLoadTime: 'loading' }
]

const dummyExternalLinks = [
    { url: 'Loading', lastCheck: 'loading', lastLoadTime: 'loading' }
]

export default function LinkList({ params, linksFetchTag, domainFetchTag }: { params: { domain: string }, linksFetchTag: string, domainFetchTag: string }) {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            // The user is not authenticated, handle it here.
        },
    });

    const [linksJson, setLinksJson] = useState(defaultLinksState);

    useEffect(() => {
        if (status !== "loading") {
            fetch(process.env.NEXT_PUBLIC_API_DOMAIN + '/api/seo/domains/' + params.domain + '/links',
                { next: { tags: [linksFetchTag], revalidate: false } })
                .then(res => res.json())
                .then(data => setLinksJson(data));
        }
    }, [status]);


    if (status === "loading" || !linksJson || !linksJson.loaded || !linksJson.links) {
        return (
            <div className={styles.linksList}>
                <Section>
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
                </Section>
            </div>
        )
    }

    const handleLinkClick = ($e: React.MouseEvent<HTMLDivElement>, index: number): void => {
        if (linksJson.links) {
            const tempLinks = linksJson.links;
            tempLinks[index].descriptionVisible = !tempLinks[index].descriptionVisible;
            setLinksJson({ ...linksJson, links: tempLinks })
        }
    }

    return (
        <>
            <MinimizableContainer title={`Links (${linksJson.links.length})`}>
                <div className={styles.links}>
                    {linksJson.links.map((link: any, index: number) => {
                        return <div key={index}>
                            <div className={[styles.linkInner, link.warningDoubleSlash ? styles.warning : null, link.errorCode ? styles.error : null].join(' ')}>
                                <div className={[styles.linkHeading].join(' ')} onClick={($e) => handleLinkClick($e, index)}>
                                    <div>
                                        {link.path}
                                    </div>
                                    <div>
                                        {format(new Date(link.lastCheck), visibleDateFormat)}
                                    </div>
                                    <div>
                                        {link.lastLoadTime > 0 ? link.lastLoadTime + 'ms' : 'no data'}
                                    </div>
                                </div>
                                <div className={[styles.linkDetails, link.descriptionVisible ? styles.visible : styles.hidden].join(' ')}>
                                    <div>
                                        <strong>Type:</strong> {link.type}
                                    </div>
                                    {link.errorCode &&
                                        <div>
                                            <strong>Error:</strong> {link.errorCode}
                                        </div>
                                    }
                                    <div>
                                        <strong>Found on:</strong> {link.foundOnPath}
                                    </div>
                                </div>
                            </div>
                        </div>
                    })}
                </div>
            </MinimizableContainer >

            <MinimizableContainer title={`External Links (${linksJson.externalLinks?.length})`}>
                <h2>External Links ({linksJson.externalLinks?.length})</h2>
                <div className={styles.externalLinks}>
                    {linksJson.externalLinks && linksJson.externalLinks.map((link: any, index: number) => {
                        return <div key={index}>
                            <div className={styles.externalLinkInner}>
                                {link.url}, {link.lastCheck}, found on: {link.foundOnPath}
                            </div>
                        </div>
                    })}
                </div>
            </MinimizableContainer >
        </>
    );
}