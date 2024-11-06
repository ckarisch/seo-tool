'use client'

import { signOut } from "next-auth/react"
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import styles from "./signin.module.scss"
import { LogIn, User, LogOut, UserCircle } from 'lucide-react'
import AdminBanner from "@/components/user/adminBanner"
import { useProtectedSession } from "@/hooks/useProtectedSession"

export default function Signin() {
  const { data: session, status } = useProtectedSession();
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleSignIn = () => {
    router.push('/auth/signin')
  }

  const handleSignOut = async () => {
    await signOut()
    setIsMenuOpen(false)
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  if (!session) {
    return (
      <button
        title='Sign in'
        className={styles.signIn}
        onClick={handleSignIn}
      >
        <LogIn strokeWidth={1.5} />
      </button>
    )
  }

  return (
    <div className={styles.userContainer}>
      <AdminBanner />
      <button
        title='User menu'
        className={`${styles.userButton} ${isMenuOpen ? styles.active : ''}`}
        onClick={toggleMenu}
      >
        <User strokeWidth={1.5} />
      </button>

      <div className={`${styles.submenu} ${isMenuOpen ? styles.open : ''}`}>
        <div className={styles.submenuContent}>
          <Link href="/app/profile" className={styles.menuItem}>
            <UserCircle strokeWidth={1.5} />
            <span>Profile</span>
          </Link>
          <button onClick={handleSignOut} className={styles.menuItem}>
            <LogOut strokeWidth={1.5} />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  )
}