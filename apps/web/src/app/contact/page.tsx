'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Ticket,
} from 'lucide-react';
import { Text } from '@/components/preferences';
import { Button } from '@/components/ui/button';
const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '';
export default function Contact() {
  const [message, setMessage] = useState('');
  function prepare(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const body = `Name: ${data.get('name')}\nEmail: ${data.get('email')}\nBooking reference: ${data.get('booking') || 'Not provided'}\n\n${data.get('message')}`;
    if (supportEmail) {
      window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(String(data.get('topic')))}&body=${encodeURIComponent(body)}`;
      setMessage(
        'Your email app will open with your message. Send it there to contact us.',
      );
    } else {
      const url = URL.createObjectURL(new Blob([body], { type: 'text/plain' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'way-to-home-message.txt';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        'Message draft downloaded. It has not been sent. Live support contact details will be added before launch.',
      );
    }
  }
  return (
    <main id="main" className="contact-page section-container">
      <section className="contact-intro">
        <div>
          <span className="eyebrow">
            <Text text="GET IN TOUCH" />
          </span>
          <h1>
            <Text text="Need a hand?" />
            <br />
            <em>
              <Text text="Let’s talk." />
            </em>
          </h1>
          <p>
            <Text text="Questions, feedback, or a little help with your journey — we’re here to listen." />
          </p>
        </div>
        <div className="contact-postcard">
          <MessageCircle size={42} />
          <span>HELLO / வணக்கம் / ආයුබෝවන්</span>
          <h2>
            <Text text="Good journeys start with a conversation." />
          </h2>
          <p>
            <Text text="Tell us what’s on your mind." />
          </p>
        </div>
      </section>
      <section className="contact-content">
        <div className="contact-methods">
          <h2>
            <Text text="A little closer. Always." />
          </h2>
          <p>
            <Text text="Share a question or let us know how we can make your next journey better." />
          </p>
          {!supportEmail && (
            <span className="demo-label">
              <Text text="Sample contact details" />
            </span>
          )}
          {[
            {
              icon: Phone,
              title: 'Call us',
              value: '+94 XX XXX XXXX',
              note: 'Phone support details coming soon',
            },
            {
              icon: Mail,
              title: 'Mail us',
              value: supportEmail || 'hello@waytohome.example',
              note: 'For questions and feedback',
            },
            {
              icon: MapPin,
              title: 'Visit us',
              value: 'Sri Lanka',
              note: 'Office address coming soon',
            },
          ].map(({ icon: Icon, title, value, note }) => (
            <div className="contact-method" key={title}>
              <span>
                <Icon size={22} />
              </span>
              <div>
                <h3>
                  <Text text={title} />
                </h3>
                <strong>{value}</strong>
                <small>
                  <Text text={note} />
                </small>
              </div>
            </div>
          ))}
          <Link className="contact-ticket-help" href="/bookings">
            <Ticket />
            <span>
              <strong>
                <Text text="Looking for your ticket?" />
              </strong>
              <small>
                <Text text="View your booking status and e-ticket" />
              </small>
            </span>
            <ArrowUpRight />
          </Link>
        </div>
        <form className="contact-message" onSubmit={prepare}>
          <span className="eyebrow">
            <Text text="WE’RE LISTENING" />
          </span>
          <h2>
            <Text text="Send us a message" />
          </h2>
          <p>
            <Text
              text={
                supportEmail
                  ? 'Prepare your message and send it through your email app.'
                  : 'Prepare a message draft. Live message delivery is not available yet.'
              }
            />
          </p>
          <div className="contact-form-row">
            <label>
              <Text text="Full name" />
              <input name="name" autoComplete="name" required maxLength={100} />
            </label>
            <label>
              <Text text="Email" />
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={200}
              />
            </label>
          </div>
          <div className="contact-form-row">
            <label>
              <Text text="Topic" />
              <select name="topic">
                <option>Booking help</option>
                <option>Payment question</option>
                <option>Feedback</option>
                <option>Other question</option>
              </select>
            </label>
            <label>
              <Text text="Booking reference (optional)" />
              <input name="booking" maxLength={60} />
            </label>
          </div>
          <label>
            <Text text="Your message" />
            <textarea
              name="message"
              rows={5}
              required
              minLength={10}
              maxLength={3000}
            />
          </label>
          <Button type="submit">
            <Text
              text={supportEmail ? 'Open email app' : 'Download message draft'}
            />
            <ArrowUpRight size={18} />
          </Button>
          {message && (
            <p className="contact-form-status" role="status">
              {message}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
