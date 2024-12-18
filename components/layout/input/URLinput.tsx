import { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import styles from './URLInput.module.scss';
import isUrl from 'is-url';

interface URLInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onValidation?: (isValid: boolean) => void;
}

export default function URLInput({ onChange, onValidation, className, ...props }: URLInputProps) {
  const [isValid, setIsValid] = useState<boolean>(false);

  const isLocalhost = (url: string): boolean => {
    try {
      const urlObject = new URL(url);
      return urlObject.hostname === 'localhost' || urlObject.hostname.startsWith('127.0.0.');
    } catch {
      return false;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // URL validation
    let processedUrl = input;
    if (processedUrl && !processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
      processedUrl = `https://${processedUrl}`;
    }

    let newIsValid = false;
    try {
      if (input === '') {
        newIsValid = false;
      } else {
        // Check if it's a localhost URL
        if (isLocalhost(processedUrl)) {
          newIsValid = true;
        } else {
          const urlObject = new URL(processedUrl);
          newIsValid = urlObject.hostname.includes('.') && isUrl(processedUrl);
        }
      }
    } catch (err) {
      newIsValid = false;
    }

    setIsValid(newIsValid);
    onValidation?.(newIsValid);
    onChange(e);
  };

  return (
    <div className={styles.wrapper}>
      <input
        type="text"
        {...props}
        className={`${styles.input} ${isValid ? styles.valid : ''} ${className || ''}`}
        onChange={handleInputChange}
        aria-label="URL input"
        aria-invalid={!isValid && props.value ? 'true' : 'false'}
      />
      {props.value && (
        <span className={styles.iconWrapper} aria-hidden="true">
          {isValid ? (
            <CheckCircle2 className={styles.validIcon} />
          ) : (
            <AlertCircle className={styles.invalidIcon} />
          )}
        </span>
      )}
    </div>
  );
}