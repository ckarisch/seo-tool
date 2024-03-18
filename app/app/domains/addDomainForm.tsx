"use client";

import { useRouter } from 'next/navigation';

export default function AddDomainForm() {
    const router = useRouter();

    const handleSubmit = async (event: any) => {
        event.preventDefault();

        const data = {
            name: event.target.name.value,
            domainName: event.target.domainName.value,
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
        event.target.domainName.value = '';

        router.refresh();
    }

    return (
        <form onSubmit={handleSubmit}>
            <input type="text" id="name" name="name" placeholder='Name der Website' required />
            <input type="text" id="domainName" name="domainName" placeholder='Domain Name der Website' required />
            <input type="number" id="crawlInterval" name="crawlInterval" placeholder='Crawl Interval in Minuten' required min={1} max={60 * 24} step={1} />
            <input type="number" id="crawlDepth" name="crawlDepth" placeholder='Crawl Depth' required min={1} max={10} step={1} />
            <input type="checkbox" id="crawlEnabled" name="crawlEnabled" />
            <div></div>
            <button type="submit">Hinzufügen</button>
        </form>
    )
}
