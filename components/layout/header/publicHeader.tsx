
import Link from "next/link";
import styles from "./publicHeader.module.scss";
import Image from "next/image";
import Signin from "@/components/user/signin";

export const PublicHeader = () => (
    <div id={styles.globalheader} className={styles.globalheader}>
        <nav id={styles.globalnav}>
            <ul className={styles.globalheaderList}>
                <li className={styles.globalheaderLi}>
                    <Link href={'/'} className={[styles.globalheaderLink, styles.logoLink].join(' ')}>
                        <Image className={styles.logo} src={'/logo.svg'} alt="logo" width={150} height={30.5}></Image>
                    </Link>
                </li>
                <li className={styles.globalheaderLi}>
                    <Link href={'/app'} className={styles.globalheaderLink}>
                        SEO App
                    </Link>
                </li>
                <li className={[styles.globalheaderLi, styles.desktop].join(' ')}>
                    <Link href={'/'} className={styles.globalheaderLink}>
                        Products
                    </Link>
                </li>
                <li className={[styles.globalheaderLi, styles.desktop].join(' ')}>
                    <Link href={'/'} className={styles.globalheaderLink}>
                        Tools
                    </Link>
                </li>
                <li className={[styles.globalheaderLi, styles.desktop].join(' ')}>
                    <Link href={'/pricing'} className={styles.globalheaderLink}>
                        Pricing
                    </Link>
                </li>
                <li className={styles.globalheaderLi}>
                    <Signin />
                </li>
            </ul>
        </nav>
    </div>
);