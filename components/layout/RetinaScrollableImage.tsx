import React, { useState, useRef } from 'react';
import Image from 'next/image';

const RetinaScrollableImage = ({ src, width, height }: { src: string | undefined, width?: number | undefined, height?: number | undefined }) => {
    const [scrollPosition, setScrollPosition] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (containerRef.current) {
            const { top, height } = containerRef.current.getBoundingClientRect();
            const scrollClip = 0.1;
            const relativeY = e.clientY - top; const scrollPercentage = Math.min(Math.max(((relativeY / height) - scrollClip) / (1 - scrollClip * 2) * 100, 0), 100);
            setScrollPosition(scrollPercentage);
        }
    };

    if (!src) return null;

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setScrollPosition(0)}
            style={{
                boxShadow: '0 0 2px rgba(0,0,0,.5)',
                position: 'relative',
                width: width ? width : '100%',
                height: height ? height : '60px',
                overflow: 'hidden',
                cursor: 'ns-resize' // Indicates vertical scrolling
            }}
        >
            <Image
                src={src}
                alt="domain image"
                fill
                style={{
                    objectFit: 'cover',
                    objectPosition: `center ${scrollPosition}%`
                }}
                quality={100}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
        </div>
    );
};

export default RetinaScrollableImage;