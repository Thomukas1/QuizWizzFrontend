/**
 * The four-character room code, boxed.
 *
 * **Display-only — nobody types it.** There is one live session and the QR code
 * is the invitation, so this exists so the room can confirm everyone is in the
 * same game and so the host has something to say out loud. Boxed per character
 * for exactly that: `GH7K` is read aloud as four characters, not as a word.
 *
 * The alphabet it's drawn from has no vowels and no `0/O/1/I/L`, so there is
 * nothing here to misread from the back of the room — see `CODE_ALPHABET`.
 */
export function RoomCode({ code, size }: { code: string; size?: string }) {
  return (
    <div
      className="room-code"
      style={size ? ({ '--code-size': size } as React.CSSProperties) : undefined}
      aria-label={`Room code ${code.split('').join(' ')}`}
    >
      {code.split('').map((character, index) => (
        <span key={index} className="room-code__cell" aria-hidden="true">
          {character}
        </span>
      ))}
    </div>
  );
}
