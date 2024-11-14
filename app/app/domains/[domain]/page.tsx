'use client';

import styles from "./page.module.scss";
import LinkList from "./linkList";
import DomainStatus from "./domainStatus";
import MetricsOverview from "@/components/domain/metricsOverview";
import Section from "@/components/layout/section";
import { useEffect, useState } from "react";
import { defaultDomainState } from "@/interfaces/domain";
import { fetchData } from "@/util/client/fetchData";
import { useSession } from "next-auth/react";

export default function Home({ params }: { params: { domain: string } }) {
  const linksFetchTag = 'seo/domain/' + params.domain + '/links';
  const domainFetchTag = 'seo/domain/' + params.domain + '/links.domain';
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState(defaultDomainState);
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      // Handle unauthenticated state
    },
  });

  useEffect(() => {
    if (status !== "loading") {
      fetchData(
        'api/seo/domains/' + params.domain,
        domainFetchTag,
        setDomain,
        () => setLoading(false)
      );
    }
  }, [status, params.domain, domainFetchTag]);

  return (
    <div className={styles.sectionContainer}>
      <Section>
        <DomainStatus
          params={params}
          domainFetchTag={domainFetchTag}
          linksFetchTag={linksFetchTag}
        />
      </Section>

      <Section>
        <MetricsOverview
          domain={{
            score: domain.score,
            performanceScore: domain.performanceScore,
            quickCheckScore: domain.quickCheckScore,
            domainName: params.domain
          }}
          loading={loading}
        />
      </Section>

      <Section>
        <LinkList
          params={params}
          linksFetchTag={linksFetchTag}
          domainFetchTag={domainFetchTag}
        />
      </Section>
    </div>
  );
}