import Link from 'next/link';
import {
  ArrowUpRight,
  BusFront,
  Mail,
  MapPin,
  Phone,
  Smartphone,
} from 'lucide-react';
import { Text } from './preferences';

export function Footer() {
  return (
    <footer className="journey-footer">
      <div className="footer-inner">
        <div className="footer-invitation">
          <div>
            <span className="footer-kicker">WAY TO HOME · SRI LANKA</span>
            <h2>
              <Text text="Every road leads to a happy moment." />
            </h2>
          </div>
          <Link className="footer-cta" href="/journeys">
            <Text text="Book a journey" />
            <ArrowUpRight size={21} />
          </Link>
        </div>
        <div className="footer-columns">
          <div className="footer-story">
            <Link href="/" className="footer-wordmark">
              <BusFront aria-hidden="true" />
              <span>
                Way <small>To</small> <em>Home.</em>
              </span>
            </Link>
            <p>
              <Text text="Your happy moments waiting for you" />
            </p>
            <span className="footer-location">
              <MapPin size={16} />
              <Text text="Made for Sri Lanka ♡" />
            </span>
            <div className="footer-route-line" aria-hidden="true">
              <i />
              <span />
              <BusFront size={23} />
              <span />
              <i />
            </div>
          </div>
          <nav aria-label="Footer journeys">
            <h3>
              <Text text="Your journey" />
            </h3>
            <Link href="/journeys">
              <Text text="Book a journey" />
            </Link>
            <Link href="/bookings">
              <Text text="My bookings" />
            </Link>
            <Link href="/login">
              <Text text="Sign in" />
            </Link>
            <Link href="/signup">
              <Text text="Create Account" />
            </Link>
          </nav>
          <nav aria-label="Footer help">
            <h3>
              <Text text="Here to help" />
            </h3>
            <Link href="/#how-it-works">
              <Text text="How it works" />
            </Link>
            <Link href="/contact">
              <Text text="Contact & booking help" />
            </Link>
            <Link href="/bookings">
              <Text text="Your e-tickets" />
            </Link>
            <Link href="/admin">
              <Text text="Admin" />
            </Link>
          </nav>
          <div className="footer-contact">
            <h3>
              <Text text="Stay connected" />
            </h3>
            <span className="footer-sample">
              <Text text="Sample contact details" />
            </span>
            <p>
              <Mail size={16} />
              <span>hello@waytohome.example</span>
            </p>
            <p>
              <Phone size={16} />
              <span>+94 XX XXX XXXX</span>
            </p>
            <Link className="footer-mobile" href="/journeys">
              <Smartphone size={24} />
              <span>
                <strong>
                  <Text text="Your next trip. In your pocket." />
                </strong>
                <small>
                  <Text text="Book on any device" />
                </small>
              </span>
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
        <div className="footer-destinations">
          <span>
            <Text text="Places to explore" />
          </span>
          <p>
            Colombo <b>·</b> Jaffna <b>·</b> Kilinochchi <b>·</b> Vavuniya{' '}
            <b>·</b> Puthukudiyiruppu <b>·</b> Kandy <b>·</b> Galle <b>·</b>{' '}
            Ella
          </p>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} Way To Home.{' '}
            <Text text="All rights reserved." />
          </span>
          <span>
            <Text text="Good journeys. Great memories." />
          </span>
          <Link href="#main">
            <Text text="Back to top" /> ↑
          </Link>
        </div>
      </div>
    </footer>
  );
}
