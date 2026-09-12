import { Text } from '@/components/preferences';
import type { Metadata } from 'next';
import { Footer } from '@/components/footer';
import { PreferencesProvider } from '@/components/preferences';
import { Header } from '@/components/header';
import './globals.css';
import './photo-theme.css';
import './preferences.css';
import './auth.css';
import './footer.css';
import './journeys.css';
import './page-polish.css';
import './premium.css';
export const metadata: Metadata = {
  title: 'Way To Home | Your Journey Home Starts Here',
  description:
    'Book your bus. Pick your seat. Enjoy the journey. Discover a simpler way to travel across Sri Lanka with Way to Home.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Clear a reload's anchor before hydration reads the initial URL. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              const navigation = performance.getEntriesByType('navigation')[0];
              if (location.pathname !== '/' || navigation?.type !== 'reload') return;
              history.scrollRestoration = 'manual';
              history.replaceState(history.state, '', location.pathname + location.search);
              window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
              window.addEventListener('load', () => {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
              }, { once: true });
            })();`,
          }}
        />
      </head>
      <body>
        <PreferencesProvider>
          <a href="#main" className="skip-link">
            <Text text={'Skip to content'} />
          </a>
          <Header />
          {children}
          <Footer />
        </PreferencesProvider>
      </body>
    </html>
  );
}
