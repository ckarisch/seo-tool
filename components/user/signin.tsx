"use client"

import { User } from "@/icons/user"
import { useSession, signIn, signOut } from "next-auth/react"
import styles from "./signin.module.scss"
import AdminBanner from "@/components/user/adminBanner"

export default function Signin() {
  const { data: session } = useSession()
  // Signed in as {session.user?.email} <br />
  if (session) {
    return (
      <>
        <button title={'abmelden'} className={styles.signOut} onClick={() => signOut()}>
          <User />
          <AdminBanner />
        </button>
      </>
    )
  }
  return (
    <>
      <button title={'anmelden'} className={styles.signOut} onClick={() => signIn()}>
        <User />
        <AdminBanner />
      </button>
    </>
  )
}