
import styles from "./page.module.scss";
import CrawlList from "./crawlList";

export default async function Home({ params }: { params: { domain: string } }) {

  return (
    <div className={styles.main}>
      <div className={styles.domain}>
        <div className={styles.domainData}>{params.domain}</div>
      </div>

      <CrawlList params={params}/>
    </div>
  );
}
