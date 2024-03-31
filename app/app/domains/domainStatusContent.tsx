"use client";

import { Domain } from "@/interfaces/domain";
import styles from "./domainStatusContent.module.scss";

export default function DomainStatusContent(params: { domain: Partial<Domain> }) {
    const { domain } = params;

    return (
        <div className={styles.domainStatusContent}>
            {domain.score !== undefined &&
                domain.score !== null &&
                <div className={styles.contentEntry}>
                    Bewertung <br />
                    <div className={[styles.score, (domain.score > 80) ? styles.veryGoodScore : ((domain.score > 50 ? styles.goodScore : styles.badScore))].join(' ')}>{domain.score}</div>
                </div>
            }
        </div >
    );
}