
import AddDomainForm from "./addDomainForm";
import styles from "./page.module.scss";
import DomainList from "./domainList";
import Section from "@/components/layout/section";

export default async function Home() {
  return (
    <>
      <Section>
        <h1>Domains</h1>
      </Section>
      <DomainList />
      <AddDomainForm />
    </>
  );
}
