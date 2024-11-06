// components/layout/background.tsx
"use client";

import { ClassAuthority } from '@/lib/ClassAuthority';
import backgroundStyles from "./background.module.scss";

type BackgroundStyle = 'mainColor' | 'mainDark' | 'light' | null;

interface BackgroundProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  backgroundImage?: string;
  backgroundStyle?: BackgroundStyle;
}

export default function Background({ 
  children, 
  className, 
  id, 
  backgroundImage = '', 
  backgroundStyle = null 
}: BackgroundProps) {
  const classes = new ClassAuthority([
    backgroundStyles.background,
    backgroundStyle === 'mainColor' && backgroundStyles.mainColor,
    backgroundStyle === 'mainDark' && backgroundStyles.mainDark,
    backgroundStyle === 'light' && backgroundStyles.light,
    className
  ]);

  return (
    <div 
      style={{ backgroundImage }} 
      id={id} 
      className={classes.value}
    >
      {children}
    </div>
  );
}