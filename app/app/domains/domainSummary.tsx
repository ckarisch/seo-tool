"use client";

import { Domain } from "@/interfaces/domain";
import domainSummary from "./domainSummary.module.scss";
import { WarningOutline } from "@/icons/warning-outline";
import { Warning } from "@/icons/warning";
import Link from "next/link";
import DomainStatusContent from "./domainStatusContent";
import Card from "@/components/layout/card";
import Image from "next/image";

export default function DomainSummary(params: { domain: Partial<Domain>, dummyText: boolean }) {
    const { domain, dummyText } = params;

    return (
        <div >
            <Link href={'/app/domains/' + domain.domainName}>
                <Card>
                    <div className={domainSummary.header}>
                        <div className={domainSummary.image}>
                            {domain.image ? <Image src={domain.image} alt="domain image"
                                width={100}
                                height={60}
                                style={{ objectFit: 'cover', objectPosition: 'top' }} /> :
                                <div className={domainSummary.placeholder}>image</div>}
                        </div>
                        <div className={domainSummary.info}>
                            <div className={[domainSummary.name, dummyText ? 'dummyText' : null].join(' ')}>{domain.name}</div>
                            <div className={[domainSummary.domain, dummyText ? 'dummyText' : null].join(' ')}>{domain.domainName}</div>
                        </div>
                        <div className={domainSummary.notifications}>
                            {domain.warning &&
                                <div className={domainSummary.notification} title={'Warnung'}><WarningOutline /></div>
                            }
                            {domain.error &&
                                <div className={[domainSummary.notification, domainSummary.err].join(' ')} title={'Fehler'}><Warning /></div>
                            }
                            {!domain.domainVerified &&
                                <div className={[domainSummary.notification, domainSummary.err].join(' ')} title={'Nicht verifiziert'}><Warning /></div>
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