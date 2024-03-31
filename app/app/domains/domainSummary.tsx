"use client";

import { Domain } from "@/interfaces/domain";
import domainList from "./domainList.module.scss";
import { WarningOutline } from "@/icons/warning-outline";
import { Warning } from "@/icons/warning";
import Link from "next/link";
import DomainStatusContent from "./domainStatusContent";

export default function DomainSummary(params: { domain: Partial<Domain> , debugDummyText: boolean}) {
    const { domain, debugDummyText } = params;

    return (
        <div >
            <Link href={'/app/domains/' + domain.domainName}>
                <div className={domainList.domainInner}>
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
                        <DomainStatusContent domain={domain} />
                    </div>
                </div>
            </Link>
        </div >
    );
}