"use client"

import { User } from "@/icons/user"
import { useSession, signIn, signOut } from "next-auth/react"
import styles from "./signin.module.scss"

export default function Signin() {
  const { data: session } = useSession()
  // Signed in as {session.user?.email} <br />
  if (session) {
    return (
      <>
        <button title={'abmelden'}className={styles.signOut} onClick={() => signOut()}><User /></button>
      </>
    )
  }
  return (
    <>
      <button title={'anmelden'} className={styles.signOut} onClick={() => signIn()}><User /></button>
    </>
  )
}