
import Section from "@/components/layout/section";
import styles from "./finally.module.scss";
import Background from "@/components/layout/background";
import Image from "next/image";

export default function Finally() {
  return (
    <Background backgroundImage="" backgroundStyle={'mainColor'}>
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
            <Image className={styles.image} src={'/images/finally.png'} alt="Finally a good SEO Tool" width={340} height={427} />
          </div>
        </div>
      </Section>
    </Background>
  );
}
