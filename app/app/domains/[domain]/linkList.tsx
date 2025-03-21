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
    const [hide404, setHide404] = useState(false);
    const [hide503, setHide503] = useState(false);
    const [hiddenLanguages, setHiddenLanguages] = useState<string[]>([]);
    const [hideTemplates, setHideTemplates] = useState(false);

    const has404Errors = linksJson.links?.some(link =>
        link.errorLogs.some(log => log.errorType.code === 'ERROR_404')
    );

    const has503Errors = linksJson.links?.some(link =>
        link.errorLogs.some(log => log.errorType.code === 'ERROR_503')
    );

    const errorCounts = {
        error404: (linksJson.links ?? []).filter(link =>
            link.errorLogs.some(log => log.errorType.code === 'ERROR_404')
        ).length,
        error503: (linksJson.links ?? []).filter(link =>
            link.errorLogs.some(log => log.errorType.code === 'ERROR_503')
        ).length
    };

    const getLangCounts = (links: UILink[]): Record<string, number> => {
        return links.reduce((acc, link) => {
            if (link.language) {
                acc[link.language] = (acc[link.language] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
    };

    const getUniqueLanguages = (links: UILink[]): string[] => {
        const languages = links
            .map(link => link.language)
            .filter((lang): lang is string => !!lang); // Filter out null/undefined
        return [...new Set(languages)].sort();
    };

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
                                </div>
                            </div>
                        ))}
                    </div>
                </MinimizableContainer>

                <MinimizableContainer title="External Links"
                    initiallyMinimized={true}>
                    <div className={styles.links}>
                        {dummyExternalLinks.map((link: any, index: number) => (
                            <div key={index}>
                                <div className={styles.linkInner}>
                                </div>
                            </div>
                        ))}
                    </div>
                </MinimizableContainer>
            </div>
        );
    }

    const handleLinkClick = ($e: React.MouseEvent<HTMLDivElement>, linkPath: string): void => {
        if (linksJson.links) {
            const tempLinks = linksJson.links;
            const linkIndex = tempLinks.findIndex(link => link.path === linkPath);
            if (linkIndex !== -1) {
                tempLinks[linkIndex].descriptionVisible = !tempLinks[linkIndex].descriptionVisible;
                setLinksJson({ ...linksJson, links: tempLinks });
            }
        }
    };

    const handleExternalLinkClick = ($e: React.MouseEvent<HTMLDivElement>, index: number): void => {
        if (linksJson.externalLinks) {
            const tempLinks = linksJson.externalLinks;
            tempLinks[index].descriptionVisible = !tempLinks[index].descriptionVisible;
            setLinksJson({ ...linksJson, externalLinks: tempLinks });
        }
    };


    const getTemplateGroups = (links: UILink[]): { [key: string]: UILink[] } => {
        return links.reduce((groups: { [key: string]: UILink[] }, link) => {
            // Extract template path (everything before the last segment)
            const pathParts = link.path.split('/');
            const templatePath = pathParts.slice(0, -1).join('/');

            if (templatePath) {
                if (!groups[templatePath]) {
                    groups[templatePath] = [];
                }
                groups[templatePath].push(link);
            }

            return groups;
        }, {});
    };

    const filterTemplatePages = (links: UILink[]): UILink[] => {
        if (!hideTemplates) return links;

        const templateGroups = getTemplateGroups(links);
        const seenTemplates = new Set<string>();

        return links.filter(link => {
            const pathParts = link.path.split('/');
            const templatePath = pathParts.slice(0, -1).join('/');

            if (pathParts.length <= 2) {
                return true;
            }

            if (!templatePath || templateGroups[templatePath]?.length <= 1) {
                return true;
            }

            if (!seenTemplates.has(templatePath)) {
                seenTemplates.add(templatePath);
                return true;
            }

            return false;
        });
    };

    const filteredLinks = filterTemplatePages(linksJson.links.filter(link => {
        if (hide404 && link.errorLogs.some(log => log.errorType.code === 'ERROR_404')) {
            return false;
        }
        if (hide503 && link.errorLogs.some(log => log.errorType.code === 'ERROR_503')) {
            return false;
        }
        if (link.language && hiddenLanguages.includes(link.language)) {
            return false;
        }
        return true;
    }));

    const PathWithTemplate = ({ path, templateGroups }: { path: string, templateGroups: { [key: string]: UILink[] } }) => {
        const pathParts = path.split('/');
        const lastPart = pathParts.pop() || '';
        const templatePath = pathParts.join('/');

        // Nur anzeigen wenn es tatsächlich ein Template mit mehreren Seiten ist
        const isTemplate = templatePath && templateGroups[templatePath]?.length > 1;

        if (!isTemplate) {
            return <span>{path}</span>;
        }

        return (
            <>
                <span className={styles.templatePath}>{templatePath}/</span>
                {lastPart}
                <span className={styles.templateCount}>
                    {templateGroups[templatePath].length} pages
                </span>
            </>
        );
    };

    const templateGroups = getTemplateGroups(linksJson.links);

    return (
        <div className={styles.sectionContainer}>
            <MinimizableContainer title={`${hideTemplates ? 'Website Templates' : 'Website Links'} (${filteredLinks.length})`}>
                <div className={styles.filterContainer}>
                    <button
                        className={[
                            styles.filterButton,
                            hideTemplates ? styles.active : '',
                            styles.noPrint
                        ].join(' ')}
                        onClick={() => setHideTemplates(!hideTemplates)}
                    >
                        Hide Similar Pages
                    </button>
                    {has404Errors && (
                        <button
                            className={[
                                styles.filterButton,
                                hide404 ? styles.active : '',
                                hide404 ? styles.noPrint : ''
                            ].join(' ')}
                            onClick={() => setHide404(!hide404)}
                        >
                            <span className={styles.noPrint}>Hide </span>404 Errors ({errorCounts.error404} pages)
                        </button>
                    )}
                    {has503Errors && (
                        <button
                            className={[
                                styles.filterButton,
                                hide503 ? styles.active : '',
                                hide503 ? styles.noPrint : ''
                            ].join(' ')}
                            onClick={() => setHide503(!hide503)}
                        >
                            <span className={styles.noPrint}>Hide </span>503 Errors ({errorCounts.error503} pages)
                        </button>
                    )}
                    {getUniqueLanguages(linksJson.links).map(lang => {
                        const count = getLangCounts(linksJson.links ?? [])[lang];
                        return (
                            <button
                                key={lang}
                                className={[
                                    styles.filterButton,
                                    hiddenLanguages.includes(lang) ? styles.active : '',
                                    hiddenLanguages.includes(lang) ? styles.noPrint : ''
                                ].join(' ')}
                                onClick={() => {
                                    setHiddenLanguages(prev =>
                                        prev.includes(lang)
                                            ? prev.filter(l => l !== lang)
                                            : [...prev, lang]
                                    )
                                }}
                            >
                                <span className={styles.noPrint}>Hide </span>Lang {lang} ({count} pages)
                            </button>
                        );
                    })}
                </div>
                <div className={styles.links}>

                    {filteredLinks.map((link: UILink) => {
                        const highestSeverity = getHighestSeverity(link.errorLogs);

                        return (
                            <div
                                key={link.path}
                                className={[
                                    styles.linkInner,
                                    link.warningDoubleSlash ? styles.warning : '',
                                    (link.errorCode || link.errorLogs.length) ? styles.error : '',
                                    link.descriptionVisible ? styles.descriptionVisible : ''
                                ].join(' ')}
                            >
                                <div
                                    className={styles.linkHeading}
                                    onClick={($e) => handleLinkClick($e, link.path)}
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
                                        <span className={styles.path}>
                                            <PathWithTemplate
                                                path={link.path}
                                                templateGroups={templateGroups}
                                            />
                                        </span>
                                    </div>
                                    <div className={styles.date}>
                                        {format(new Date(link.lastCheck), visibleDateFormat)}
                                    </div>
                                    <div className={styles.loadTime}>
                                        {link.lastLoadTime > 0 ? link.lastLoadTime + 'ms' : 'no data'}
                                    </div>
                                </div>
                                {link.descriptionVisible && <div
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
                                </div>}
                            </div>
                        );
                    })}
                </div>
            </MinimizableContainer>

            <MinimizableContainer title={`External Links (${linksJson.externalLinks?.length})`}
                initiallyMinimized={true}
                className={styles.externalLinks}>
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