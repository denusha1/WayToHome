'use client';
import { FormEvent, useState } from 'react';
import { api, Trip } from '@/lib/api';
import { dateLabel, time } from '@/lib/utils';
import { Button } from './ui/button';
export function LocationForm({ trips }: { trips: Trip[] }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      await api(`/admin/trips/${fields.get('tripId')}/location`, {
        method: 'POST',
        body: JSON.stringify({
          latitude: Number(fields.get('latitude')),
          longitude: Number(fields.get('longitude')),
        }),
      });
      setMessage(
        'Location published. Passengers can see it on their tracking page.',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="admin-form passenger-form" onSubmit={submit}>
      <h2>Publish a bus location</h2>
      <p>
        Enter coordinates reported by the bus GPS device. Only publish the
        vehicle’s location.
      </p>
      <label>
        Journey
        <select name="tripId" required>
          {trips
            .filter(
              (t) => Math.abs(Date.parse(t.departure) - Date.now()) < 86400000,
            )
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.from} → {t.to} · {dateLabel(t.departure)} {time(t.departure)}{' '}
                · {t.bus}
              </option>
            ))}
        </select>
      </label>
      <div className="form-pair">
        <label>
          Latitude
          <input
            name="latitude"
            type="number"
            min="-90"
            max="90"
            step="any"
            required
            placeholder="6.9271"
          />
        </label>
        <label>
          Longitude
          <input
            name="longitude"
            type="number"
            min="-180"
            max="180"
            step="any"
            required
            placeholder="79.8612"
          />
        </label>
      </div>
      <Button disabled={busy}>Publish location</Button>
      {message && (
        <p className="success-message" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
