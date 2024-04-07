
import Section from "@/components/layout/section";
import Finally from "./finally";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <Finally />
      <Section>
        <h1>
          Test your Website
        </h1>
        <input type="text"/>
      </Section>
    </main>
  );
}
