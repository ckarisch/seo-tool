"use client";

import cardStyles from "./card.module.scss";

export default function Card({ children, className }: {
    children: Readonly<React.ReactNode>,
    className?: string | undefined
}) {
    return (
        <div className={[cardStyles.card, className].join(' ')}>
            {children}
        </div>
    );
}