import { ChangeEvent } from 'react';
import styles from './toggle.module.scss';

interface ToggleProps {
  checked?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  label?: string | React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

const Toggle = ({ 
  checked = false, 
  onChange, 
  label, 
  disabled = false,
  loading = false,
  icon
}: ToggleProps) => {
  return (
    <div className={[
      styles.toggleContainer,
      loading ? styles.loading : ''
    ].join(' ')}>
      {label && (
        <span className={styles.label} onClick={(e) => e.stopPropagation()}>
          {icon && <span className={styles.icon}>{icon}</span>}
          {label}
        </span>
      )}
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled || loading}
          className={styles.input}
        />
        <span className={styles.slider} />
      </label>
    </div>
  );
};

export default Toggle;