// description.tsx
import React from 'react';
import styles from './description.module.scss';

const Description = () => {
    return (
        <div className={styles.container}>
            <div className={styles.mainContent}>
                <h1 className={styles.title}>Ihre Website Analyse</h1>
                <p className={styles.text}>Eine SEO-Analyse dient dazu, die Sichtbarkeit und Performance einer 
                    Website in Suchmaschinen zu bewerten und zu optimieren. Dabei 
                    werden wichtige Aspekte wie Keyword-Performance, technische 
                    Website-Struktur, Backlink-Profil und Content-Qualität überprüft. Ziel 
                    ist es, Schwachstellen zu identifizieren und Strategien zu entwickeln, 
                    um die Rankings zu verbessern.</p>
            </div>
            <div className={styles.legend}>
                <h2 className={styles.legendTitle}>Farben Legende</h2>
                <ul className={styles.legendList}>
                    <li className={styles.legendItem}>
                        <span className={[styles.legendDot, styles.success].join(' ')}></span>
                        Keine Fehler
                    </li>
                    <li className={styles.legendItem}>
                        <span className={[styles.legendDot, styles.warning].join(' ')}></span>
                        Fehler
                    </li>
                    <li className={styles.legendItem}>
                        <span className={[styles.legendDot, styles.error].join(' ')}></span>
                        Schwere Fehler
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default Description;