import type { Metadata } from "next";
import layout from "./layout.module.scss";
import { PublicHeader } from '@/components/layout/Header/PublicHeader';
import { isPreviewEnv } from "@/util/environment";

const isVercelProduction = process.env.VERCEL_ENV === 'production';

export const metadata: Metadata = {
  title: "Rankidang",
  description: "analyze your website performance",
  robots: isVercelProduction ? "index, follow" : "noindex, nofollow"
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const isPreview = isPreviewEnv()
  return (
    <div className={layout.layout}>
      <PublicHeader isPreview={isPreview} />
      {children}
    </div>
  );
}
