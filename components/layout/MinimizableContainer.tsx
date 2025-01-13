import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import styles from './MinimizableContainer.module.css';
import Card from './card';

interface MinimizableContainerProps {
  title?: React.ReactNode; // Changed from string to ReactNode
  children: React.ReactNode;
  initiallyMinimized?: boolean;
  className?: any
}

const MinimizableContainer: React.FC<MinimizableContainerProps> = ({
  title,
  children,
  initiallyMinimized = false,
  className
}) => {
  const [isMinimized, setIsMinimized] = useState(initiallyMinimized);

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <Card nopadding className={className}>
      <div className={`${styles.container} ${isMinimized ? styles.minimized : ''}`}>
        <div className={styles.header}>
          {title && <div className={styles.title}>{title}</div>} {/* Changed from h2 to div to better handle custom content */}
          <button className={styles.minimizeButton} onClick={toggleMinimize}>
            {isMinimized ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </Card>
  );
};

export default MinimizableContainer;