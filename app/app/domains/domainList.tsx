"use client";

import Link from "next/link";
import styles from "./page.module.scss";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const dummyDomains = [
    { name: 'Domains loading', domainName: 'example.com' },
]

export default function DomainList() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            // The user is not authenticated, handle it here.
        },
    });

    const [domainsJson, setDomainsJson] = useState({ domains: [], loaded: false });

    useEffect(() => {
        if (status !== "loading") {
            fetch(process.env.API_DOMAIN + '/api/seo/domains/')
                .then(res => res.json())
                .then(data => setDomainsJson(data));
        }
    }, [status]);

    if (status === "loading" || !domainsJson || !domainsJson.loaded || !domainsJson.domains) {
        return (
            <div className={styles.domains}>
                {dummyDomains.map((domain: { name: string, domainName: string }, index: number) => {
                    return <div key={index} className={styles.domain}>
                        <Link href={'/app/domains/' + domain.domainName}>
                            <div key={index} className={styles.domainInner}>
                                {domain.name}, {domain.domainName}
                            </div>
                        </Link>
                    </div>
                })}
            </div>
        )
    }

    return (
        <div className={styles.domains}>
            {domainsJson.domains.map((domain: { name: string, domainName: string }, index: number) => {
                return <div key={index} className={styles.domain}>
                    <Link href={'/app/domains/' + domain.domainName}>
                        <div key={index} className={styles.domainInner}>
                            {domain.name}, {domain.domainName}
                        </div>
                    </Link>
                </div>
            })}
        </div>
    );
}