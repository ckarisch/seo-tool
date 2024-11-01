// app/get-premium/PricingSwitch.tsx
import { useEffect, useState } from 'react';
import styles from './PricingSwitch.module.scss';

interface PricingSwitchProps {
  onPlanChange: (isMonthly: boolean) => void;
  initialIsMonthly?: boolean;
}

export const PricingSwitch: React.FC<PricingSwitchProps> = ({ onPlanChange,
  initialIsMonthly = true  }) => {
  const [isMonthly, setIsMonthly] = useState(initialIsMonthly);

  useEffect(() => {
    setIsMonthly(initialIsMonthly);
  }, [initialIsMonthly]);

  const handleToggle = () => {
    setIsMonthly(!isMonthly);
    onPlanChange(!isMonthly);
  };

  return (
    <div className={styles.container}>
      <div className={styles.switchRow}>
        <span className={`${styles.label} ${isMonthly ? styles.active : ''}`}>
          Monthly Subscription
        </span>
        <button
          onClick={handleToggle}
          className={styles.switch}
          type="button"
          aria-label="Toggle pricing plan"
        >
          <span className={`${styles.slider} ${isMonthly ? '' : styles.sliderRight}`} />
        </button>
        <span className={`${styles.label} ${!isMonthly ? styles.active : ''}`}>
          Lifetime License
        </span>
      </div>
      <p className={styles.description}>
        {isMonthly 
          ? "Pay monthly, cancel anytime" 
          : "One-time payment, lifetime access"}
      </p>
    </div>
  );
};

export default PricingSwitch;