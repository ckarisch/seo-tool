"use client";

import styles from "./linkList.module.scss";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { defaultLinksState, UILink } from "@/interfaces/link";
import { format } from "date-fns";
import { visibleDateFormat } from "@/config/config";
import MinimizableContainer from "@/components/layout/MinimizableContainer";
import { Severity } from "@prisma/client";

const severityOrder: { [key in Severity]: number } = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
    INFO: 0
};

const getHighestSeverity = (errorLogs: UILink['errorLogs']): Severity | null => {
    if (!errorLogs.length) return null;
    return errorLogs.reduce((highest, current) => {
        if (severityOrder[current.errorType.severity] > severityOrder[highest]) {
            return current.errorType.severity;
        }
        return highest;
    }, errorLogs[0].errorType.severity);
};

const dummyLinks = [
    { path: 'Loading', lastCheck: 'loading', lastLoadTime: 'loading' }
];

const dummyExternalLinks = [
    { url: 'Loading', lastCheck: 'loading', lastLoadTime: 'loading' }
];

export default function LinkList({ params, linksFetchTag, domainFetchTag }: {
    params: { domain: string },
    linksFetchTag: string,
    domainFetchTag: string
}) {
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
            <div className={styles.sectionContainer}>
                <MinimizableContainer title="Links">
                    <div className={styles.links}>
                        {dummyLinks.map((link: any, index: number) => (
                            <div key={index}>
                                <div className={styles.linkInner}>
                                    {link.path}, {link.lastCheck}, {link.lastLoadTime}
                                </div>
                            </div>
                        ))}
                    </div>
                </MinimizableContainer>

                <MinimizableContainer title="External Links">
                    <div className={styles.links}>
                        {dummyExternalLinks.map((link: any, index: number) => (
                            <div key={index}>
                                <div className={styles.linkInner}>
                                    {link.url}, {link.lastCheck}, {link.lastLoadTime}
                                </div>
                            </div>
                        ))}
                    </div>
                </MinimizableContainer>
            </div>
        );
    }

    const handleLinkClick = ($e: React.MouseEvent<HTMLDivElement>, index: number): void => {
        if (linksJson.links) {
            const tempLinks = linksJson.links;
            tempLinks[index].descriptionVisible = !tempLinks[index].descriptionVisible;
            setLinksJson({ ...linksJson, links: tempLinks });
        }
    };

    const handleExternalLinkClick = ($e: React.MouseEvent<HTMLDivElement>, index: number): void => {
        if (linksJson.externalLinks) {
            const tempLinks = linksJson.externalLinks;
            tempLinks[index].descriptionVisible = !tempLinks[index].descriptionVisible;
            setLinksJson({ ...linksJson, externalLinks: tempLinks });
        }
    };

    return (
        <div className={styles.sectionContainer}>
            <MinimizableContainer title={`Links (${linksJson.links.length})`}>
                <div className={styles.links}>
                    {linksJson.links.map((link: UILink, index: number) => {
                        const highestSeverity = getHighestSeverity(link.errorLogs);

                        return (
                            <div
                                key={index}
                                className={[
                                    styles.linkInner,
                                    link.warningDoubleSlash ? styles.warning : '',
                                    (link.errorCode || link.errorLogs.length) ? styles.error : ''
                                ].join(' ')}
                            >
                                <div
                                    className={styles.linkHeading}
                                    onClick={($e) => handleLinkClick($e, index)}
                                >
                                    <div className={styles.linkHeadingMain}>
                                        {highestSeverity && (
                                            <span className={[
                                                styles.severityBadge,
                                                styles[highestSeverity.toLowerCase()]
                                            ].join(' ')}>
                                                {highestSeverity}
                                            </span>
                                        )}
                                        <span className={styles.path}>{link.path}</span>
                                    </div>
                                    <div>
                                        {format(new Date(link.lastCheck), visibleDateFormat)}
                                    </div>
                                    <div>
                                        {link.lastLoadTime > 0 ? link.lastLoadTime + 'ms' : 'no data'}
                                    </div>
                                </div>
                                <div
                                    className={[
                                        styles.linkDetails,
                                        link.descriptionVisible ? styles.visible : styles.hidden
                                    ].join(' ')}
                                >
                                    <div>
                                        <strong>Type:</strong> {link.type || 'Unknown'}
                                    </div>
                                    {link.errorCode && (
                                        <div>
                                            <strong>Error Code:</strong> {link.errorCode}
                                        </div>
                                    )}
                                    <div>
                                        <strong>Found on:</strong> {link.foundOnPath || 'Unknown'}
                                    </div>

                                    {link.errorLogs.length > 0 && (
                                        <div className={styles.errorLogsContainer}>
                                            <strong>Error Logs:</strong>
                                            {link.errorLogs.map((log, i) => (
                                                <div key={i} className={styles.errorLog}>
                                                    <div className={styles.errorTypeHeader}>
                                                        <span className={[
                                                            styles.severityBadge,
                                                            styles[log.errorType.severity.toLowerCase()]
                                                        ].join(' ')}>
                                                            {log.errorType.severity}
                                                        </span>
                                                        <span className={styles.errorCode}>{log.errorType.code}</span>
                                                    </div>

                                                    <div className={styles.errorDetails}>
                                                        <div><strong>Name:</strong> {log.errorType.name}</div>
                                                        <div><strong>Category:</strong> {log.errorType.category}</div>
                                                        <div><strong>Occurrences:</strong> {log.occurrence}</div>
                                                        <div>
                                                            <strong>Created:</strong> {format(new Date(log.createdAt), visibleDateFormat)}
                                                        </div>
                                                        {log.resolvedAt && (
                                                            <div>
                                                                <strong>Resolved:</strong> {format(new Date(log.resolvedAt), visibleDateFormat)}
                                                            </div>
                                                        )}
                                                        {log.metadata && (
                                                            <div className={styles.metadata}>
                                                                <strong>Metadata:</strong>
                                                                <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </MinimizableContainer>

            <MinimizableContainer title={`External Links (${linksJson.externalLinks?.length})`}>
                <div className={styles.links}>
                    {linksJson.externalLinks && linksJson.externalLinks.map((link: any, index: number) => (
                        <div
                            key={index}
                            className={[
                                styles.linkInner,
                                link.warningDoubleSlash ? styles.warning : '',
                                link.errorCode ? styles.error : ''
                            ].join(' ')}
                        >
                            <div
                                className={styles.linkHeading}
                                onClick={($e) => handleExternalLinkClick($e, index)}
                            >
                                <div className={styles.linkHeadingMain}>
                                    <span className={styles.path}>{link.url}</span>
                                </div>
                                <div>
                                    {format(new Date(link.lastCheck), visibleDateFormat)}
                                </div>
                            </div>
                            <div
                                className={[
                                    styles.linkDetails,
                                    link.descriptionVisible ? styles.visible : styles.hidden
                                ].join(' ')}
                            >
                                <div>
                                    <strong>Type:</strong> external
                                </div>
                                <div>
                                    <strong>Found on:</strong> {link.foundOnPath}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </MinimizableContainer>
        </div>
    );
}