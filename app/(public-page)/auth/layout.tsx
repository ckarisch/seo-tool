import { CookieConsentProvider } from "@/components/cookie/CookieConsentProvider";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CookieConsentProvider>
      {children}
    </CookieConsentProvider>
  );
}
