
import styles from "./page.module.scss";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import LinkList from "./linkList";
import Link from "next/link";

export default async function Home({ params }: { params: { domain: string } }) {
  const linksFetchTag = 'seo/domain/' + params.domain + '/links';
  const domainFetchTag = 'seo/domain/' + params.domain + '/links.domain';

  const session = await getServerSession(authOptions);
  console.log('session on page', session);

  return (
    <div className={styles.main}>
      <div className={styles.domain}>
        <div className={styles.domainData}>{params.domain}</div>
        <Link href={'/app/domains/' + params.domain + '/crawls'}>
          Crawling Log
        </Link>
      </div>

      <LinkList params={params} linksFetchTag={linksFetchTag} domainFetchTag={domainFetchTag} />
    </div>
  );
}
