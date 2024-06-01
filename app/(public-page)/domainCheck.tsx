
import Section from "@/components/layout/section";
import styles from "./domainCheck.module.scss";
import Background from "@/components/layout/background";
import Image from "next/image";
import CrawlRequestPublic from "./crawlRequestPublic";

export default function DomainCheck() {
  return (
    <Section>
      <div className={styles.domainCheck}>
        <div className={styles.text}>
          <h2 className={styles.heading}>
            Test your Website
          </h2>
          <p className={styles.domainCheckDescription}>
            Initiate a free automated SEO check for your domain to receive an overview of the SEO metrics our tool can assess. For more detailed insights, simply register — no credit card required.
          </p>
        </div>
        <div className={styles.check}>
          <CrawlRequestPublic />
        </div>
      </div>
    </Section>
  );
}
