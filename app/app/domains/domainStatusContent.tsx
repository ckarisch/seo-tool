"use client";

import { defaultDomainState, Domain } from "@/interfaces/domain";
import styles from "./domainStatusContent.module.scss";
import { InformationCircleOutline } from "@/icons/information-circle-outline";
import { useState } from "react";
import { fetchData, LoadingState } from "@/util/client/fetchData";

export default function DomainStatusContent(params: { domain: Partial<Domain> }) {
    const { domain } = params;
    const fetchTag = 'seo/domain/' + params.domain.domainName + '/verification.domain';


    const [verificationResponse, setverificationResponse] = useState(defaultDomainState);
    const [verificationStatus, setverificationStatus] = useState<LoadingState>('idle');

    const handleVerificationRequest = async (event: any) => {
        event.preventDefault();
        setverificationStatus('loading');
        if (!confirm('do you really want to verify?')) {
            setverificationStatus('idle');
            return false;
        }
        const endpoint = process.env.NEXT_PUBLIC_API_DOMAIN + '/api/seo/domains/' + domain.domainName + '/verify';

        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        }

        const response = await fetch(endpoint, options);
        const jsonData = await response.json();
        setverificationStatus('idle');

        // fetch after crawling finished
        await fetchData('api/seo/domains/' + domain.domainName, fetchTag, setverificationResponse, null);

        return jsonData;
    };

    return (
        <div className={styles.domainStatusContent}>
            {!domain.domainVerified &&
                <div className={[styles.contentEntry].join(' ')} title={'Nicht verifiziert'}>
                    Verification code: {domain.domainVerificationKey}
                    <form onSubmit={handleVerificationRequest} onClick={(event) => { event.preventDefault(); }}>
                        <button onClick={(event) => { event.preventDefault(); handleVerificationRequest(event); }} type="submit" disabled={verificationStatus == 'loading'}>verify domain</button>
                    </form>
                </div>
            }
            {domain.domainVerified && domain.score !== undefined &&
                domain.score !== null &&
                <div className={styles.contentEntry}>
                    Bewertung <br />
                    <div className={[styles.score, (domain.score > 0.80) ? styles.veryGoodScore : ((domain.score > 0.50 ? styles.goodScore : styles.badScore))].join(' ')}>{domain.score * 100}</div>
                </div>
            }
            <div>
                {domain.disableNotifications &&
                    <div title={'Benachrichtigungen deaktiviert'}><InformationCircleOutline /></div>
                }
            </div>
        </div >
    );
}