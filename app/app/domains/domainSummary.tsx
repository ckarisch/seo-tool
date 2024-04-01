"use client";

import { Domain } from "@/interfaces/domain";
import domainSummary from "./domainSummary.module.scss";
import { WarningOutline } from "@/icons/warning-outline";
import { Warning } from "@/icons/warning";
import Link from "next/link";
import DomainStatusContent from "./domainStatusContent";
import Card from "@/components/layout/card";

export default function DomainSummary(params: { domain: Partial<Domain> , debugDummyText: boolean}) {
    const { domain, debugDummyText } = params;

    return (
        <div >
            <Link href={'/app/domains/' + domain.domainName}>
                <Card>
                    <div className={domainSummary.header}>
                        <div className={domainSummary.image}>
                            img
                        </div>
                        <div className={domainSummary.info}>
                            <div className={[domainSummary.name, debugDummyText ? 'dummyText' : null].join(' ')}>{domain.name}</div>
                            <div className={[domainSummary.domain, debugDummyText ? 'dummyText' : null].join(' ')}>{domain.domainName}</div>
                        </div>
                        <div className={domainSummary.notifications}>
                            {domain.warning &&
                                <div className={domainSummary.notification} title={'Warnung'}><WarningOutline /></div>
                            }
                            {domain.error &&
                                <div className={[domainSummary.notification, domainSummary.err].join(' ')} title={'Fehler'}><Warning /></div>
                            }
                        </div>
                    </div>
                    <div className={domainSummary.devider}></div>
                    <div className={domainSummary.content}>
                        <DomainStatusContent domain={domain} />
                    </div>
                </Card>
            </Link>
        </div >
    );
}