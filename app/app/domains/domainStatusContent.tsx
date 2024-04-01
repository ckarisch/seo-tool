"use client";

import { Domain } from "@/interfaces/domain";
import styles from "./domainStatusContent.module.scss";
import { InformationCircleOutline } from "@/icons/information-circle-outline";

export default function DomainStatusContent(params: { domain: Partial<Domain> }) {
    const { domain } = params;

    return (
        <div className={styles.domainStatusContent}>
            {domain.score !== undefined &&
                domain.score !== null &&
                <div className={styles.contentEntry}>
                    Bewertung <br />
                    <div className={[styles.score, (domain.score > 0.80) ? styles.veryGoodScore : ((domain.score > 0.50 ? styles.goodScore : styles.badScore))].join(' ')}>{domain.score*100}</div>
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