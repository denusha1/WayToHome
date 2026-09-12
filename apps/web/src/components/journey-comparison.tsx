'use client';
import { useState } from 'react';
import { ArrowLeftRight, X } from 'lucide-react';
import { Trip } from '@/lib/api';
import { money, time } from '@/lib/utils';
import { usePreferences } from './preferences';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
export function JourneyComparison({
  trips,
  onClear,
  onRemove,
  onBook,
}: {
  trips: Trip[];
  onClear: () => void;
  onRemove: (id: string) => void;
  onBook: (trip: Trip) => void;
}) {
  const [open, setOpen] = useState(false);
  const { tr } = usePreferences();
  if (!trips.length) return null;
  return (
    <>
      <aside className="comparison-tray" aria-label={tr('Journey comparison')}>
        <div>
          <ArrowLeftRight size={20} />
          <strong>{tr('Compare your options')}</strong>
          <span>{trips.length}/3</span>
        </div>
        <div className="comparison-picks">
          {trips.map((t) => (
            <button
              key={t.id}
              aria-label={`${tr('Remove')} ${t.bus} ${time(t.departure)}`}
              onClick={() => onRemove(t.id)}
            >
              {t.bus} · {time(t.departure)} <X size={13} />
            </button>
          ))}
        </div>
        <Button disabled={trips.length < 2} onClick={() => setOpen(true)}>
          {tr('Compare journeys')}
        </Button>
        <button className="comparison-clear" onClick={onClear}>
          {tr('Clear')}
        </button>
      </aside>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="comparison-dialog">
          <DialogTitle>{tr('A little clarity before you go.')}</DialogTitle>
          <DialogDescription>
            {tr(
              'Compare up to three journeys. Seat availability is checked again when you book.',
            )}
          </DialogDescription>
          <div className="comparison-scroll">
            <table>
              <thead>
                <tr>
                  <th>{tr('Your journey')}</th>
                  {trips.map((t) => (
                    <th key={t.id}>
                      {t.bus}
                      <small>
                        {tr(t.from)} → {tr(t.to)}
                      </small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Departure time', ...trips.map((t) => time(t.departure))],
                  [
                    'Duration',
                    ...trips.map(
                      (t) =>
                        `${Math.floor(t.duration / 60)}h ${t.duration % 60}m`,
                    ),
                  ],
                  ['Per seat', ...trips.map((t) => money(t.price))],
                  ['Seats', ...trips.map((t) => String(t.available))],
                  ['Boarding point', ...trips.map((t) => t.boarding)],
                  [
                    'Amenities',
                    ...trips.map((t) => t.amenities.map(tr).join(' · ')),
                  ],
                ].map(([label, ...values]) => (
                  <tr key={label}>
                    <th>{tr(label)}</th>
                    {values.map((v, i) => (
                      <td key={trips[i].id}>{v}</td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th>{tr('Book a journey')}</th>
                  {trips.map((t) => (
                    <td key={t.id}>
                      <Button
                        disabled={!t.available}
                        onClick={() => {
                          setOpen(false);
                          onBook(t);
                        }}
                      >
                        {tr('Select seats')}
                      </Button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
