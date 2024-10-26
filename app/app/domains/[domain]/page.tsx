
import styles from "./page.module.scss";
import LinkList from "./linkList";
import DomainStatus from "./domainStatus";

export default function Home({ params }: { params: { domain: string } }) {
  const linksFetchTag = 'seo/domain/' + params.domain + '/links';
  const domainFetchTag = 'seo/domain/' + params.domain + '/links.domain';

  return (
    <div className={styles.sectionContainer}>
      <DomainStatus 
        params={params} 
        domainFetchTag={domainFetchTag} 
        linksFetchTag={linksFetchTag} 
      />
      <LinkList 
        params={params} 
        linksFetchTag={linksFetchTag} 
        domainFetchTag={domainFetchTag} 
      />
    </div>
  );
}