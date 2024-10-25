"use client";

import { useRouter } from 'next/navigation';
import styles from './addDomainForm.module.scss'
import URLInput from '@/components/layout/input/URLinput';
import { useState } from 'react';

export default function AddDomainForm() {
    const router = useRouter();
    const [url, setUrl] = useState('');
    const [isUrlValid, setIsUrlValid] = useState(false);
    const [isError, setIsError] = useState(false);

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        if (!isUrlValid) {
            setIsError(true);

            // Remove the shake effect after the animation is done (0.5s)
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
                alert('Diese Domain existiert bereits.');
                return;
            default:
                alert('unbekannter Fehler');
                return;
        }

        alert(`gespeichert`);

        event.target.name.value = '';
        event.target.url.value = '';

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
                    <input type="text" id="name" name="name" placeholder='Name der Website' required />
                </div>

                <div className={styles.inputGroup}>
                    <h3>Domain Name</h3>
                    <URLInput
                        className={[styles.input, isError ? styles.shake : null].join(' ')}
                        placeholder="www.example.com"
                        onChange={handleInputChange}
                        onValidation={setIsUrlValid}
                        value={url}
                        name='url'
                    />
                </div>

                <button type="submit">Hinzufügen</button>
            </form>
        </div>
    )
}
