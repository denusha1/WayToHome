'use client';
import { useState } from 'react';
import { api, Booking } from '@/lib/api';
import { Button } from './ui/button';
export function CancellationControl({
  booking: b,
  onChange,
}: {
  booking: Booking;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (b.refundedAt)
    return <p className="helper">Refund processed · {b.refundReference}</p>;
  if (b.status === 'REFUND_PENDING')
    return (
      <p className="helper">
        Refund processing/reconciliation pending. Ticket is no longer valid.
      </p>
    );
  if (b.refundRequestedAt)
    return (
      <p className="helper">
        Cancellation requested. Refund awaits operator approval.
      </p>
    );
  if (
    !['PENDING', 'CONFIRMED', 'PAYMENT_REVIEW'].includes(b.status) ||
    b.checkedInAt ||
    !b.trip ||
    Date.parse(b.trip.departure) <= Date.now()
  )
    return null;
  const paid = b.status !== 'PENDING';
  return (
    <details className="cancellation-control">
      <summary>
        {paid ? 'Request cancellation' : 'Cancel unpaid booking'}
      </summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const reason = String(new FormData(e.currentTarget).get('reason'));
          setBusy(true);
          setError('');
          try {
            await api(`/bookings/${b.id}/cancel`, {
              method: 'POST',
              body: JSON.stringify({ reason }),
            });
            onChange();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p>
          {paid
            ? 'The operator will review your refund request. Submitting it does not guarantee a refund.'
            : 'This releases your unpaid seats. A payment received later will require refund review.'}
        </p>
        <label>
          Reason
          <textarea name="reason" required minLength={5} maxLength={500} />
        </label>
        <Button type="submit" variant="outline" disabled={busy}>
          {busy ? 'Submitting…' : 'Confirm request'}
        </Button>
        {error && <p role="alert">{error}</p>}
      </form>
    </details>
  );
}
