"use client";

import Link from "next/link";
import styles from "./page.module.scss";
import domainList from "./domainList.module.scss";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { WarningOutline } from "@/icons/warning-outline";
import { Warning } from "@/icons/warning";
import { Domain } from "@/interfaces/domain";

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
                {dummyDomains.map((domain: { name: string, domainName: string }, index: number) => {
                    return <div key={index} className={styles.domain}>
                        <Link href={'/app/domains/'}>
                            <div key={index} className={domainList.domainInner}>
                                <div className={domainList.header}>
                                    <div className={domainList.image}>
                                        img
                                    </div>
                                    <div className={domainList.info}>
                                        <div className={[domainList.name, 'dummyText'].join(' ')}>{domain.name}</div>
                                        <div className={[domainList.domain, 'dummyText'].join(' ')}>{domain.domainName}</div>
                                    </div>
                                    <div className={domainList.notifications}>
                                        <div className={domainList.notification}></div>
                                    </div>
                                </div>
                                <div className={domainList.devider}></div>
                                <div className={domainList.content}>
                                    status content
                                </div>
                            </div>
                        </Link>
                    </div >
                })
                }
            </div >
        )
    }

    return (
        <div className={styles.domains}>
            {domainsJson.domains.map((domain: Domain, index: number) => {
                return <div key={index} className={styles.domain}>
                    <Link href={'/app/domains/' + domain.domainName}>
                        <div key={index} className={domainList.domainInner}>
                            <div className={domainList.header}>
                                <div className={domainList.image}>
                                    img
                                </div>
                                <div className={domainList.info}>
                                    <div className={[domainList.name, debugDummyText ? 'dummyText' : null].join(' ')}>{domain.name}</div>
                                    <div className={[domainList.domain, debugDummyText ? 'dummyText' : null].join(' ')}>{domain.domainName}</div>
                                </div>
                                <div className={domainList.notifications}>
                                    {domain.warning &&
                                        <div className={domainList.notification} title={'Warnung'}><WarningOutline /></div>
                                    }
                                    {domain.error &&
                                        <div className={[domainList.notification, domainList.err].join(' ')} title={'Fehler'}><Warning /></div>
                                    }
                                </div>
                            </div>
                            <div className={domainList.devider}></div>
                            <div className={domainList.content}>
                                status content
                            </div>
                        </div>
                    </Link>
                </div >
            })}
        </div >
    );
}