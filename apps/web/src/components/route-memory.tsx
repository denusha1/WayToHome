'use client';
import { useEffect, useState } from 'react';
import { Heart, History, X } from 'lucide-react';
import { usePreferences } from './preferences';
type Route = { from: string; to: string };
function read(key: string): Route[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value)
      ? value
          .filter(
            (r) =>
              typeof r?.from === 'string' &&
              typeof r?.to === 'string' &&
              r.from &&
              r.to &&
              r.from !== r.to &&
              r.from.length < 100 &&
              r.to.length < 100,
          )
          .slice(0, 5)
      : [];
  } catch {
    return [];
  }
}
const same = (a: Route, b: Route) => a.from === b.from && a.to === b.to;
export function RouteMemory({
  from,
  to,
  onChoose,
}: {
  from: string;
  to: string;
  onChoose: (from: string, to: string) => void;
}) {
  const { tr } = usePreferences();
  const [recent, setRecent] = useState<Route[]>([]);
  const [saved, setSaved] = useState<Route[]>([]);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const stored = read('wth-recent-routes');
    const route = { from, to };
    const next =
      from && to && from !== to
        ? [route, ...stored.filter((r) => !same(r, route))].slice(0, 5)
        : stored;
    setRecent(next);
    setSaved(read('wth-saved-routes'));
    try {
      localStorage.setItem('wth-recent-routes', JSON.stringify(next));
    } catch {}
  }, [from, to]);
  function save(next: Route[]) {
    setSaved(next);
    try {
      localStorage.setItem('wth-saved-routes', JSON.stringify(next));
      setNotice('');
    } catch {
      setNotice(
        tr(
          'Browser storage is unavailable. Saved routes last only for this visit.',
        ),
      );
    }
  }
  const favourite = saved.some((r) => same(r, { from, to }));
  return (
    <section className="route-memory" aria-label={tr('Your route shortcuts')}>
      <div className="route-memory-heading">
        <div>
          <Heart size={18} />
          <strong>{tr('Your familiar roads')}</strong>
          <small>{tr('Saved on this browser')}</small>
        </div>
        {from && to && (
          <button
            aria-pressed={favourite}
            onClick={() =>
              save(
                favourite
                  ? saved.filter((r) => !same(r, { from, to }))
                  : [{ from, to }, ...saved].slice(0, 5),
              )
            }
          >
            <Heart size={14} fill={favourite ? 'currentColor' : 'none'} />
            {tr(favourite ? 'Route saved' : 'Save this route')}
          </button>
        )}
      </div>
      {saved.length > 0 && (
        <div className="route-shortcuts">
          {saved.map((r) => (
            <span key={r.from + r.to}>
              <button onClick={() => onChoose(r.from, r.to)}>
                {tr(r.from)} → {tr(r.to)}
              </button>
              <button
                aria-label={`${tr('Remove saved route')} ${r.from} to ${r.to}`}
                onClick={() => save(saved.filter((x) => !same(x, r)))}
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="route-recents">
        <History size={15} />
        <span>{tr('Recent searches')}</span>
        {recent.length ? (
          recent.map((r) => (
            <button key={r.from + r.to} onClick={() => onChoose(r.from, r.to)}>
              {tr(r.from)} → {tr(r.to)}
            </button>
          ))
        ) : (
          <small>{tr('Search a route to build your shortcuts.')}</small>
        )}
        {recent.length > 0 && (
          <button
            className="clear-recents"
            onClick={() => {
              setRecent([]);
              try {
                localStorage.removeItem('wth-recent-routes');
              } catch {}
            }}
          >
            {tr('Clear history')}
          </button>
        )}
      </div>
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
