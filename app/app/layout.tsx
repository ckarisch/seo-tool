import layout from "./layout.module.scss";
import AppHeader from "../../components/layout/Header/AppHeader";
import SessionCheck from "./SessionCheck";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SessionCheck />
      <AppHeader />
      <main className={layout.main}>
        {children}
      </main>
    </>
  );
}