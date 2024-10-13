import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import styles from './MinimizableContainer.module.css';
import Card from './card';

interface MinimizableContainerProps {
  title?: string;
  children: React.ReactNode;
  initiallyMinimized?: boolean;
}

const MinimizableContainer: React.FC<MinimizableContainerProps> = ({
  title,
  children,
  initiallyMinimized = false
}) => {
  const [isMinimized, setIsMinimized] = useState(initiallyMinimized);

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <Card nopadding>
      <div className={`${styles.container} ${isMinimized ? styles.minimized : ''}`}>
        <div className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
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