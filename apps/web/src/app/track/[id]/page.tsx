'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MapPin, ArrowUpRight, BusFront } from 'lucide-react';
import { api, Trip } from '@/lib/api';
import { Button } from '@/components/ui/button';
type Tracking = {
  trip: Trip;
  location: { latitude: number; longitude: number; updatedAt: string } | null;
};
export default function TrackingPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Tracking | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let mounted = true;
    const refresh = () =>
      api<Tracking>(`/trips/${encodeURIComponent(id)}/location`)
        .then((r) => {
          if (mounted) {
            setData(r);
            setError('');
            setNow(Date.now());
          }
        })
        .catch((e) => {
          if (mounted) setError(e.message);
        });
    refresh();
    const timer = setInterval(refresh, 10000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [id]);
  const stale =
    data?.location && now - Date.parse(data.location.updatedAt) > 120000;
  const coords = data?.location
    ? `${data.location.latitude},${data.location.longitude}`
    : '';
  return (
    <main id="main" className="inner-page section-container">
      <div className="eyebrow">YOUR BUS, ON ITS WAY</div>
      <h1>Follow your journey.</h1>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {data && (
        <>
          <h2 className="text-2xl">
            {data.trip.from} → {data.trip.to}
          </h2>
          <p className="helper">
            <BusFront size={18} />
            {data.trip.bus} · {data.trip.boarding}
          </p>
          {data.location ? (
            <div className="admin-form">
              <p className={stale ? 'error-message' : 'success-message'}>
                {stale
                  ? 'Location is out of date. Showing the last reported position.'
                  : 'Recent bus location · refreshes every 10 seconds.'}
              </p>
              <p className="helper">
                Updated{' '}
                {new Date(data.location.updatedAt).toLocaleTimeString('en-GB', {
                  timeZone: 'Asia/Colombo',
                })}{' '}
                Sri Lanka time.
              </p>
              {process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY && (
                <iframe
                  title="Bus location"
                  width="100%"
                  height="380"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&q=${coords}&zoom=14`}
                />
              )}
              <Button asChild className="mt-5">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${coords}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin /> Open in Google Maps <ArrowUpRight />
                </a>
              </Button>
            </div>
          ) : (
            <div className="empty-state">
              <MapPin size={36} />
              <h2>Your bus hasn’t shared a location yet.</h2>
              <p>
                Its last reported position will appear here when the operator
                starts sharing GPS updates.
              </p>
              <Button asChild variant="outline">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.trip.boarding + ', Sri Lanka')}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View boarding point <ArrowUpRight />
                </a>
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
