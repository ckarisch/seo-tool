"use client";


import styles from "./page.module.scss";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Domain } from "@/interfaces/domain";
import DomainSummary from "./domainSummary";

const dummyDomains = [
    { name: 'Domains loading', domainName: 'example.com' },
    { name: 'Domains loading', domainName: 'example.com' },
    { name: 'Domains loading', domainName: 'example.com' },
    { name: 'Domains loading', domainName: 'example.com' },
    { name: 'Domains loading', domainName: 'example.com' },
]


const debugDummyText = false;

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
            fetch(process.env.NEXT_PUBLIC_API_DOMAIN + '/api/seo/domains/')
                .then(res => res.json())
                .then(data => setDomainsJson(data));
        }
    }, [status]);

    if (status === "loading" || !domainsJson || !domainsJson.loaded || !domainsJson.domains) {
        return (
            <div className={styles.domains}>
            {dummyDomains.map((domain: Partial<Domain>, index: number) => (
                    <DomainSummary key={index} domain={domain} debugDummyText={debugDummyText} />
                ))}
            </div >
        )
    }

    return (
        <div className={styles.domains}>
            {domainsJson.domains.map((domain: Domain, index: number) => (
                <DomainSummary key={index} domain={domain} debugDummyText={debugDummyText} />
            ))}
        </div >
    );
}