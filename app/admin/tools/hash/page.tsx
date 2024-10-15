'use client';

import { useState } from 'react';

export default function ScryptHashPage() {
  const [password, setPassword] = useState('');
  const [salt, setSalt] = useState('');
  const [hash, setHash] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    setHash('');

    try {
      // Call the API to generate the hash
      const res = await fetch('/api/admin/hash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password, salt }),
      });

      const data = await res.json();

      if (res.ok) {
        setHash(data.hash);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('An error occurred while generating the hash');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Scrypt Hash Generator</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="salt">Salt:</label>
          <input
            type="text"
            id="salt"
            value={salt}
            onChange={(e) => setSalt(e.target.value)}
            required
          />
        </div>
        <button type="submit">Generate Hash</button>
      </form>

      {error && (
        <div style={{ color: 'red', marginTop: '20px' }}>
          <h3>Error:</h3>
          <pre>{error}</pre>
        </div>
      )}

      {hash && (
        <div style={{ marginTop: '20px' }}>
          <h3>Generated Hash:</h3>
          <pre>{hash}</pre>
        </div>
      )}
    </div>
  );
}
