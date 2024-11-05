"use client";

import styles from './addDomainForm.module.scss';
import URLInput from '@/components/layout/input/URLinput';
import { useState } from 'react';
import { useDomainsStore } from '@/store/domains';

interface AddDomainFormProps {
    onClose?: () => void;
}

export default function AddDomainForm({ onClose }: AddDomainFormProps) {
    const [url, setUrl] = useState('');
    const [isUrlValid, setIsUrlValid] = useState(false);
    const [isError, setIsError] = useState(false);

    const addDomain = useDomainsStore(state => state.addDomain);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isUrlValid) {
            setIsError(true);
            setTimeout(() => {
                setIsError(false);
            }, 500);
            return false;
        }

        const formData = new FormData(event.currentTarget);
        const data = {
            name: formData.get('name') as string,
            domainName: url,
        };

        const result = await addDomain(data);

        if (!result.success) {
            alert(result.error); // We'll replace this with banner notification
            return;
        }

        // Clear form and close
        (event.target as HTMLFormElement).reset();
        setUrl('');
        if (onClose) {
            onClose();
        }
    }

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUrl(event.target.value);
    };

    return (
        <div className={styles.formContainer}>
            <form onSubmit={handleSubmit}>
                <div className={styles.inputGroup}>
                    <h3>Website Name</h3>
                    <input type="text" id="name" name="name" placeholder="Name of the website" required />
                </div>

                <div className={styles.inputGroup}>
                    <h3>Domain Name</h3>
                    <URLInput
                        className={[styles.input, isError ? styles.shake : null].join(' ')}
                        placeholder="www.example.com"
                        onChange={handleInputChange}
                        onValidation={setIsUrlValid}
                        value={url}
                        name="url"
                    />
                </div>

                <button type="submit">Add</button>
            </form>
        </div>
    );
}