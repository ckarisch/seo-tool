
import AddDomainForm from "./addDomainForm";
import styles from "./page.module.scss";
import DomainList from "./domainList";

export default async function Home() {
  return (
    <div className={styles.main}>
      Domains:
      <div className={styles.domains}>
        <DomainList />
      </div>

      <AddDomainForm />
    </div >
  );
}
