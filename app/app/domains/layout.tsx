import type { Metadata } from "next";
import Link from "next/link";
import layout from "./layout.module.scss";
import Image from "next/image";
import Signin from "@/components/user/signin";

export const metadata: Metadata = {
  title: "SEO App",
  description: "The best app for SEO analysis.",
  robots: "noindex, nofollow" // app path should not be indexed
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <div className={layout.main}>
        {children}
      </div>
    </ div>
  );
}
