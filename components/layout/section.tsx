"use client";

import sectionStyles from "./section.module.scss";

export default function Section({ children, className, id, style, boxed = false }: {
    children: Readonly<React.ReactNode>,
    className?: any,
    id?: any,
    style?: any,
    boxed?: boolean
}) {
    if (boxed) {
        return (
            <section id={id} className={[sectionStyles.section].join(' ') + (className ? (' ' + className) : '')} style={style}>
                {children}
            </section>
        );
    }
    else {
        return (
            <section id={id} style={style}>
                <div className={[sectionStyles.inner].join(' ') + (className ? (' ' + className) : '')} >
                    {children}
                </div>
            </section>
        );
    }
}