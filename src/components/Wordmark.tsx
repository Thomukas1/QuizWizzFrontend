/**
 * QUIZWIZZ. Letterspaced in the display face, because it is read as a sign
 * rather than as a word — on a television from three metres, and at the top of
 * a join screen as the one thing confirming you scanned the right code.
 */
export function Wordmark({ size = 'var(--font-size-2xl)' }: { size?: string }) {
  return (
    <h1
      className="text-center"
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: size,
        letterSpacing: '0.22em',
        color: 'var(--accent)',
        // The display face is all-caps already; the indent compensates for the
        // trailing letterspace so the mark stays optically centred.
        textIndent: '0.22em',
        textShadow: '0 2px 12px rgba(0, 0, 0, 0.6)',
      }}
    >
      QUIZWIZZ
    </h1>
  );
}
