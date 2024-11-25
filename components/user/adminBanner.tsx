"use client";

import { useEffect, useState } from "react";
import { fetchData } from "@/util/client/fetchData";
import { defaultUserState } from "@/interfaces/user";
import { Admin } from "@/icons/admin";
import styles from "./adminBanner.module.scss";
import { PremiumUser } from "@/icons/premiumUser";
import { useProtectedSession } from "@/hooks/useProtectedSession";
import { UserRole } from "@prisma/client";

const image = (role: string | undefined) => {
    switch (role) {
        case UserRole.ADMIN:
            return <div> <Admin /> </div>;
        case UserRole.PREMIUM:
            return <div> <PremiumUser /> </div>;
        default: return null;
    }
}

export default function AdminBanner() {
    const { data: session, status } = useProtectedSession();

    const [apiUser, setApiUser] = useState(defaultUserState);

    useEffect(() => {
        if (status !== "loading") {
            fetchData('api/user/', 'api/user/', setApiUser, null);
        }
    }, [status]);

    if (status === "loading") {
        return (
            <div className={''}>
            </div>
        )
    }

    return (
        <div className={styles.adminBanner}>
            {image(apiUser.role)}
        </div>
    );
}