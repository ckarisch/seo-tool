
import styles from "./page.module.scss";

export default async function Home({ params }: { params: { domain: string } }) {

  return (
    <div className={styles.settings}>
    </div>
  );
}
