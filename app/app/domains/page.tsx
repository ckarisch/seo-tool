
import AddDomainForm from "./addDomainForm";
import styles from "./page.module.scss";
import DomainList from "./domainList";

export default async function Home() {
  return (
    <div className={styles.main}>
      <h1>Domains</h1>
      <DomainList />
      <AddDomainForm />
    </div >
  );
}
