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
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      // The user is not authenticated, handle it here.
    },
  });

  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [crawlLoading, setCrawlLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [domainJson, setDomainJson] = useState(defaultDomainState);

  useEffect(() => {
    if (status !== "loading") {
      fetchData(
        'api/seo/domains/' + params.domain, 
        'domainFetchTag', 
        setDomainJson, 
        () => setInitialLoading(false)
      );
    }
  }, [status, params.domain]);

  const handleSendNotificationChange = async (_e: ChangeEvent<HTMLInputElement>) => {
    setNotificationsLoading(true);
    // Use current state to determine new value
    const newValue = !domainJson.disableNotifications;  // If currently disabled, we want to enable

    try {
      const endpoint = `/api/seo/domains/${params.domain}/settings/disableNotifications`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newValue })
      });

      if (!response.ok) throw new Error('Failed to update notifications setting');

      setDomainJson(prev => ({
        ...prev,
        disableNotifications: newValue
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
      const endpoint = `/api/seo/domains/${params.domain}/settings/crawlEnabled`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newValue })
      });

      if (!response.ok) throw new Error('Failed to update crawl setting');

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
                <div className={styles.settingInfo}>Loading settings...</div>
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
              <div className="self-center">
                <Toggle
                  loading={notificationsLoading}
                  checked={!domainJson.disableNotifications}
                  onChange={handleSendNotificationChange}
                  label="Enable notifications"
                />
              </div>
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
              <form onSubmit={handleSetCrawlEnabled} className="w-full md:w-auto">
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
                    <>
                      {domainJson.crawlEnabled ? (
                        <Pause size={16} />
                      ) : (
                        <Play size={16} />
                      )}
                      <span>
                        {domainJson.crawlEnabled ? 'Disable crawling' : 'Enable crawling'}
                      </span>
                    </>
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