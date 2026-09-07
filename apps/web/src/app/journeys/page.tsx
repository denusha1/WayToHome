import { Suspense } from 'react';
import { Journeys } from '@/components/journeys';
export default function JourneysPage() {
  return (
    <Suspense
      fallback={
        <main id="main" className="inner-page section-container">
          Loading journeys…
        </main>
      }
    >
      <Journeys />
    </Suspense>
  );
}
