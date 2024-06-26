
import Section from "@/components/layout/section";
import Finally from "./finally";
import styles from "./page.module.scss";
import DomainCheck from "./domainCheck";

export default function Home() {
  return (
    <main className={styles.main}>
      <Finally />
      <DomainCheck />
    </main>
  );
}
