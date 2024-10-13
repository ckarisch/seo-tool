"use client";

import cardStyles from "./card.module.scss";

export default function Card({ children, className, nopadding }: {
    children: Readonly<React.ReactNode>,
    className?: string | undefined,
    nopadding?: boolean
}) {
    return (
        <div className={[cardStyles.card, nopadding ? cardStyles.nopadding : null, className].join(' ')}>
            {children}
        </div>
    );
}