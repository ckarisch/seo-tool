"use client";

import sectionStyles from "./section.module.scss";

export default function Section({ children, className, id }: {
    children: Readonly<React.ReactNode>,
    className?: any,
    id?: any
}) {
    return (
        <section id={id} className={[sectionStyles.section].join(' ') + (className ? (' ' + className) : '')}>
            {children}
        </section>
    );
}