
import Section from "@/components/layout/section";
import styles from "./page.module.scss";
import ImprintPage from "@/components/content/ImprintPage";

export default function Home() {
  return (
    <main className={styles.main}>
      <ImprintPage />
    </main>
  );
}
