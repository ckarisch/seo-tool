"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Section from "@/components/layout/section";
import { fetchData } from "@/util/client/fetchData";
import { defaultUserState } from "@/interfaces/user";

export default function AdminBanner() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            // The user is not authenticated, handle it here.
        },
    });

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
        <div className={''}>
            <Section>
                {apiUser.role === 'admin' ? 'Your are an admin.' : ''}
            </Section>
        </div>
    );
}