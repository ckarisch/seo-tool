// finally.tsx
import Section from "@/components/layout/section";
import styles from "./finally.module.scss";
import Background from "@/components/layout/background";
import { Graphs } from "@/grafics/Graphs";

export default function Finally() {
  return (
    <Background backgroundImage="" backgroundStyle={'mainDark'}>
      <Section>
        <div className={styles.finally}>
          <div className={styles.text}>
            <h1 className={styles.heading}>
              Finally automated <br />
              SEO performance <br />
              analysis<br />
            </h1>
            <p className={styles.description}>
              Automized On-Site SEO Performance Tracking. Benefit from hundreds of predefined analyses. Add custom checks. Get notified automatically.
            </p>
          </div>

          <div className={styles.imageContainer}>
            <Graphs />
          </div>
        </div>
      </Section>
    </Background>
  );
}