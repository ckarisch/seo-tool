
import styles from "./page.module.scss";
import CrawlList from "./crawlList";

export default async function Home({ params }: { params: { domain: string } }) {

  return (
    <div className={styles.main}>
      <CrawlList params={params} />
    </div>
  );
}
