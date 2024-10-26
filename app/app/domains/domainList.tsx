"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Domain } from "@/interfaces/domain";
import DomainSummary from "./domainSummary";
import styles from "./domainList.module.scss";

const dummyDomains: Partial<Domain>[] = [0, 1, 2, 3].map(i => ({
  name: 'Loading...',
  domainName: 'example.com',
  domainVerified: true
}));

export default function DomainList() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      // Handle unauthenticated state
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
      <div className={styles.domainsGrid}>
        {dummyDomains.map((_, index) => (
          <div key={index} className={styles.skeletonCard} />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.domainsGrid}>
      {domainsJson.domains.map((domain: Domain, index: number) => (
        <DomainSummary key={index} domain={domain} dummyText={false} />
      ))}
    </div>
  );
}