import React, { useState, useRef } from 'react';
import Image from 'next/image';
import styles from './RetinaScrollableImage.module.scss';

const RetinaScrollableImage = ({ 
    src, 
    width, 
    height 
}: { 
    src: string | undefined, 
    width?: number | undefined, 
    height?: number | undefined 
}) => {
    const [scrollPosition, setScrollPosition] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (containerRef.current && !window.matchMedia('print').matches) {
            const { top, height } = containerRef.current.getBoundingClientRect();
            const scrollClip = 0.1;
            const relativeY = e.clientY - top; 
            const scrollPercentage = Math.min(Math.max(
                ((relativeY / height) - scrollClip) / (1 - scrollClip * 2) * 100, 
                0
            ), 100);
            setScrollPosition(scrollPercentage);
        }
    };

    if (!src) return null;

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setScrollPosition(0)}
            className={styles.imageContainer}
            style={{
                width: width ? width : '100%',
                height: height ? height : '60px',
            }}
        >
            <Image
                src={src}
                alt="Domain preview"
                fill
                className={styles.image}
                quality={100}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                style={{
                    objectFit: 'cover',
                    objectPosition: `center ${scrollPosition}%`
                }}
                priority={true}
                unoptimized={window?.matchMedia('print').matches}
            />
        </div>
    );
};

export default RetinaScrollableImage;