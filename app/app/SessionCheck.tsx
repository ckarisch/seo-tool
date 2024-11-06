'use client'

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SessionCheck() {
    const router = useRouter()
    useSession({
        required: true, onUnauthenticated: () => {
            router.push('/api/auth/signin')
        }
    });
    return null;
}
