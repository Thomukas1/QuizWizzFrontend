/** Musical flourish divider — keeps a page breathing between sections. */
export function Flourish() {
  return (
    <div
      className="px-md flex justify-between text-sm select-none opacity-80"
      aria-hidden="true"
    >
      <span>🎤</span>
      <span>🎶</span>
      <span>🎤</span>
      <span>🎶</span>
      <span>🎤</span>
      <span>🎶</span>
      <span>🎤</span>
    </div>
  );
}
