import { Camera } from '../scene';

// Dims everything outside the content region with a huge spread shadow, so the
// padded board edges fall away into darkness and attention stays on the world.
export function Spotlight({ camera }: { camera: Camera }) {
  const { left, top, width, height } = camera.content;
  return (
    <div
      className="absolute pointer-events-none"
      style={{ left, top, width, height, boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}
    />
  );
}
