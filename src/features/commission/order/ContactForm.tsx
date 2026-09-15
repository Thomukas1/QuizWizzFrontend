import { useState } from 'react';
import { TextField, TextAreaField } from '../../../primitives/form';

// Interim transport: no backend inbox endpoint yet, so submitting opens the
// visitor's mail client pre-addressed to us. Swap for a POST when the ordering
// flow is built out.
const CONTACT_EMAIL = 'slopboptv@gmail.com';

interface Props {
  // Driven by the carousel above the form. Shown read-only and carried into the
  // email, so an inquiry arrives already naming the artist they picked.
  selectedArtistName?: string;
}

export function ContactForm({ selectedArtistName }: Props) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const canSend = email.trim() !== '' && message.trim() !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    const artistLine = selectedArtistName ? `Selected artist: ${selectedArtistName}\n\n` : '';
    const mailto =
      `mailto:${CONTACT_EMAIL}` +
      `?subject=${encodeURIComponent('SlopBop — Commission inquiry')}` +
      `&body=${encodeURIComponent(`${artistLine}${message}\n\nReply to: ${email}`)}`;
    window.location.href = mailto;
  };

  return (
    // The heading and the artist carousel are the page's — this is the fields
    // only, so picking an artist and writing the note read as one section.
    <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
      {selectedArtistName && (
        <TextField
          label="Selected artist"
          value={selectedArtistName}
          onChange={() => {}}
          readOnly
          help="pick above"
        />
      )}

      <TextField
        label="Your email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        help="We'll reply to you here."
        required
      />

      <TextAreaField
        label="Your message"
        value={message}
        onChange={setMessage}
        rows={6}
        placeholder="Tell us about your group and the mixtape you have in mind."
        required
      />

      <button type="submit" className="special full-width" disabled={!canSend}>
        Send
      </button>
    </form>
  );
}
