
import Section from "@/components/layout/section";
import styles from "./domainCheck.module.scss";
import Background from "@/components/layout/background";
import Image from "next/image";

export default function DomainCheck() {
  return (
    <Section>
      <div className={styles.domainCheck}>
        <div className={styles.text}>
          <h1>
            Test your Website
          </h1>
          <p className={styles.domainCheckDescription}>
            Initiate a free automated SEO check for your domain to receive an overview of the SEO metrics our tool can assess. For more detailed insights, simply register — no credit card required.
          </p>
        </div>
        <div className={styles.check}>
          <input className={styles.input} type="text" placeholder="www.example.com" />
          <button className={styles.checkButton}>
            Check
          </button>
        </div>
      </div>
    </Section>
  );
}
