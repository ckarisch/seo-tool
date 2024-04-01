"use client";

import cardStyles from "./card.module.scss";

export default function Card({ children }: {
    children: Readonly<React.ReactNode>
}) {
    return (
        <div className={cardStyles.card}>
            {children}
        </div>
    );
}