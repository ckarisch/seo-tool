import type { Metadata } from "next";
import Signin from "@/components/user/signin";
import layout from "./layout.module.scss";
import Link from "next/link";
import Image from "next/image";
import Section from "@/components/layout/section";
import { PublicHeader } from "@/components/layout/header/publicHeader";

export const metadata: Metadata = {
  title: "SEO Tool",
  description: "all in one SEO tool",
  robots: "noindex, nofollow"
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <div className={layout.layout}>
      <PublicHeader />
      {children}
    </div>
  );
}
