import Section from "@/components/layout/section";
import layout from "./layout.module.scss";

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Section>
        <div id={layout.settingsHeader}>
          <h2>Settings</h2>
        </div>
      </Section>
      {children}
    </>
  );
}
