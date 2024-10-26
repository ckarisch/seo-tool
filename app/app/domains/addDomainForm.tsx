"use client";

import { useRouter } from 'next/navigation';
import styles from './addDomainForm.module.scss';
import URLInput from '@/components/layout/input/URLinput';
import { useState } from 'react';

interface AddDomainFormProps {
    onClose?: () => void;
}

export default function AddDomainForm({ onClose }: AddDomainFormProps) {
    const router = useRouter();
    const [url, setUrl] = useState('');
    const [isUrlValid, setIsUrlValid] = useState(false);
    const [isError, setIsError] = useState(false);

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        if (!isUrlValid) {
            setIsError(true);

            setTimeout(() => {
                setIsError(false);
            }, 500);
            return false;
        }

        const data = {
            name: event.target.name.value,
            domainName: url,
        }

        const JSONdata = JSON.stringify(data);
        const endpoint = '/api/seo/domains/';

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSONdata,
        }

        const response = await fetch(endpoint, options);
        const result = await response.json();
        console.log("result", result);
        switch (result.error) {
            case undefined: break;
            case 'domain_already_exists':
                alert('This domain already exists.');
                return;
            default:
                alert('Unknown error');
                return;
        }

        alert('Saved');

        event.target.name.value = '';
        event.target.url.value = '';

        if (onClose) {
            onClose();
        }

        router.refresh();
    }

    const handleInputChange = (event: any) => {
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
    )
}