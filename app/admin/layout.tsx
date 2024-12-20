"use client";

import React, { useEffect, useState } from 'react';
import adminStyles from './admin.module.scss';
import { defaultUserState } from '@/interfaces/user';
import { fetchData } from '@/util/client/fetchData';
import layout from "./layout.module.scss";
import Image from 'next/image';
import Signin from '@/components/user/signin';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminDashboard from '@/components/admin/dashboard/adminDashboard';
import AppHeader from '@/components/layout/Header/AppHeader';
import { useProtectedSession } from '@/hooks/useProtectedSession';
import { UserRole } from '@prisma/client';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const { data: session, status } = useProtectedSession();

  const [apiUser, setApiUser] = useState(defaultUserState);

  useEffect(() => {
    if (status !== "loading") {
      fetchData('api/user/', 'api/user/', setApiUser, null);
    }
  }, [status]);

  if (!apiUser || !apiUser.id) {
    return <>
      <div id={layout.globalheader} className={layout.globalheader}>
        <nav id={layout.globalnav}>
          <ul className={layout.globalheaderList}>
            <li className={layout.globalheaderLi}>
              <Link href={'/'} className={[layout.globalheaderLink, layout.logoLink].join(' ')}>
                <Image className={layout.logo} src={'/logo.svg'} alt="logo" width={150} height={30.5}></Image>
              </Link>
            </li>
            <li className={layout.globalheaderLi}>
              <Signin />
            </li>
          </ul>
        </nav>
      </div>
      <div className={adminStyles.adminContainer}>
      </div>
    </>;
  }

  if (!(apiUser.role === UserRole.ADMIN)) {
    router.push('/')
    return <div>not allowed</div>;
  }

  return (
    <>
      <AppHeader />
      <main className={adminStyles.adminContainer}>
        <AdminDashboard >
          {children}
        </AdminDashboard>
      </main>
    </>
  );
}
