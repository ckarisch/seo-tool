
import styles from "./page.module.scss";
import { getServerSession } from "next-auth";
import LinkList from "./linkList";
import Link from "next/link";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";

export default async function Home({ params }: { params: { domain: string } }) {
  const linksFetchTag = 'seo/domain/' + params.domain + '/links';
  const domainFetchTag = 'seo/domain/' + params.domain + '/links.domain';

  const session = await getServerSession(authOptions);
  console.log('session on page', session);

  return (
    <div className={styles.main}>

      <LinkList params={params} linksFetchTag={linksFetchTag} domainFetchTag={domainFetchTag} />
    </div>
  );
}
