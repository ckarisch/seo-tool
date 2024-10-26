"use client";

import React, { ChangeEvent, useEffect, useState } from "react";
import styles from "./page.module.scss";
import Toggle from "@/components/layout/input/toggle";
import { fetchData } from "@/util/client/fetchData";
import { useSession } from "next-auth/react";
import { defaultDomainState } from "@/interfaces/domain";
import Section from "@/components/layout/section";
import Card from "@/components/layout/card";
import { Play, Pause } from 'lucide-react';

export default function Settings({ params }: { params: { domain: string } }) {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      // The user is not authenticated, handle it here.
    },
  });

  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [crawlLoading, setCrawlLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [domainJson, setDomainJson] = useState(defaultDomainState);
  const domainFetchTag = 'domainFetchTag';

  useEffect(() => {
    if (status !== "loading") {
      fetchData(
        'api/seo/domains/' + params.domain, 
        domainFetchTag, 
        setDomainJson, 
        () => setInitialLoading(false)
      );
    }
  }, [status]);

  const handleSendNotificationChange = async (e: ChangeEvent<HTMLInputElement>) => {
    setNotificationsLoading(true);

    try {
      const endpoint = `${process.env.NEXT_PUBLIC_API_DOMAIN}/api/seo/domains/${params.domain}/settings/disableNotifications`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: !!e.target.checked })
      });

      if (!response.ok) throw new Error('Failed to update notifications setting');

      // Update only the relevant part of the state
      const result = await response.json();
      setDomainJson(prev => ({
        ...prev,
        disableNotifications: !!e.target.checked
      }));

    } catch (error) {
      console.error('Error updating notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleSetCrawlEnabled = async (event: React.FormEvent) => {
    event.preventDefault();
    setCrawlLoading(true);
    
    try {
      const newValue = !domainJson.crawlEnabled;
      const endpoint = `${process.env.NEXT_PUBLIC_API_DOMAIN}/api/seo/domains/${params.domain}/settings/crawlEnabled`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newValue })
      });

      if (!response.ok) throw new Error('Failed to update crawl setting');

      // Update only the relevant part of the state
      setDomainJson(prev => ({
        ...prev,
        crawlEnabled: newValue
      }));

    } catch (error) {
      console.error('Error updating crawl setting:', error);
    } finally {
      setCrawlLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Section>
        <div className={styles.settings}>
          <Card>
            <div className={styles.settingItem}>
              <div className={styles.settingContent}>
                Loading settings...
              </div>
            </div>
          </Card>
        </div>
      </Section>
    );
  }

  return (
    <Section>
      <div className={styles.settings}>
        <Card>
          <div className={styles.settingItem}>
            <div className={styles.settingContent}>
              <div className={styles.settingInfo}>
                <h3 className={styles.settingTitle}>Notifications</h3>
                <p className={styles.settingDescription}>
                  Control whether you receive notifications about domain changes and updates.
                </p>
              </div>
              <Toggle
                loading={notificationsLoading}
                checked={!!domainJson.disableNotifications}
                onChange={handleSendNotificationChange}
                label="Enable notifications"
              />
            </div>
          </div>
        </Card>

        <Card>
          <div className={styles.settingItem}>
            <div className={styles.settingContent}>
              <div className={styles.settingInfo}>
                <h3 className={styles.settingTitle}>Crawling Status</h3>
                <p className={styles.settingDescription}>
                  Enable or disable automatic crawling for this domain.
                </p>
              </div>
              <form onSubmit={handleSetCrawlEnabled}>
                <button 
                  className={[
                    styles.button,
                    domainJson.crawlEnabled ? styles.crawlEnabled : styles.crawlDisabled,
                    crawlLoading ? styles.loading : ''
                  ].join(' ')} 
                  type="submit"
                  disabled={crawlLoading}
                >
                  {!crawlLoading ? (
                    domainJson.crawlEnabled ? (
                      <><Pause size={16} /> Disable crawling</>
                    ) : (
                      <><Play size={16} /> Enable crawling</>
                    )
                  ) : (
                    'Updating...'
                  )}
                </button>
              </form>
            </div>
          </div>
        </Card>
      </div>
    </Section>
  );
}