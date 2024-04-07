"use client";

import backgroundStyles from "./background.module.scss";

export default function Background({ children, className, id, backgroundImage, backgroundStyle }: {
    children: Readonly<React.ReactNode>,
    className?: any,
    id?: any,
    backgroundImage: string,
    backgroundStyle: 'mainColor' | null
}) {
    return (
        <div style={{ backgroundImage }} id={id} className={[backgroundStyles.background, backgroundStyle === 'mainColor' ? backgroundStyles.mainColor : null].join(' ') + (className ? (' ' + className) : '')}>
            {children}
        </div>
    );
}