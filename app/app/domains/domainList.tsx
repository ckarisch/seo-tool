"use client";


import styles from "./domainList.module.scss";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Domain } from "@/interfaces/domain";
import DomainSummary from "./domainSummary";

const dummyDomains: Partial<Domain>[] = [0, 1, 2, 3, 4].map(i => (
    { name: 'Domains loading', domainName: 'example.com', domainVerified: true }));


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
                    <DomainSummary key={index} domain={domain} dummyText={true} />
                ))}
            </div >
        )
    }

    return (
        <div className={styles.domains}>
            {domainsJson.domains.map((domain: Domain, index: number) => (
                <DomainSummary key={index} domain={domain} dummyText={debugDummyText} />
            ))}
        </div >
    );
}