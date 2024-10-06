"use client";
import React, { ChangeEvent, ChangeEventHandler, useEffect, useState } from "react";
import styles from "./page.module.scss";
import Toggle from "@/components/layout/input/toggle";
import { fetchData } from "@/util/client/fetchData";
import { useSession } from "next-auth/react";
import { defaultDomainState } from "@/interfaces/domain";
import Section from "@/components/layout/section";

enum loadingBooleanState {
  on,
  off,
  loading
}

export default function Settings({ params }: { params: { domain: string } }) {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      // The user is not authenticated, handle it here.
    },
  });

  const [disableNotificationsLoading, setDisableNotificationsLoading] = React.useState(true);
  const domainFetchTag = 'domainFetchTag';

  const [domainJson, setDomainJson] = useState(defaultDomainState);

  useEffect(() => {
    if (status !== "loading") {
      fetchData('api/seo/domains/' + params.domain, domainFetchTag, setDomainJson, () => (setDisableNotificationsLoading(false)));
    }
  }, [status]);


  const handleSendNotificationChange = async (e: ChangeEvent<HTMLInputElement>) => {
    // send request
    console.log(e.target.checked);
    setDisableNotificationsLoading(true);

    const endpoint = process.env.NEXT_PUBLIC_API_DOMAIN + '/api/seo/domains/' + params.domain + '/settings/disableNotifications';

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value: !!e.target.checked })
    }

    const response = await fetch(endpoint, options);
    const jsonData = await response.json();

    // await fetchData('api/seo/domains/' + params.domain + '/settings/disableNotifications', '', null);
    fetchData('api/seo/domains/' + params.domain, domainFetchTag, setDomainJson, () => (setDisableNotificationsLoading(false)));

    return jsonData;
  }

  const handleSetCrawlEnalbed = async (event: any, value: boolean) => {
    event.preventDefault();
    const endpoint = process.env.NEXT_PUBLIC_API_DOMAIN + '/api/seo/domains/' + params.domain + '/settings/crawlEnabled';

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credetials: 'include',
      body: JSON.stringify({ value: value })
    }

    const response = await fetch(endpoint, options);
    const jsonData = await response.json();

    // fetch after crawling finished
    await fetchData('api/seo/domains/' + params.domain, domainFetchTag, setDomainJson, null);

    return jsonData;
  };

  return (
    <Section>
      <div className={styles.settings}>
        <Toggle loading={disableNotificationsLoading} checked={!!domainJson.disableNotifications} onChange={handleSendNotificationChange} label={'Alle Benachrichtigungen deaktivieren'} />

        <form onSubmit={($e) => handleSetCrawlEnalbed($e, !domainJson.crawlEnabled)}>
          <button className={[styles.setCrawlEnabledButton, domainJson.crawlEnabled ? styles.crawlEnabled : styles.crawlDisabled].join(' ')} type="submit">{domainJson.crawlEnabled ? 'disable crawling' : 'enable crawling'}</button>
        </form>
      </div>
    </Section>
  );
}
