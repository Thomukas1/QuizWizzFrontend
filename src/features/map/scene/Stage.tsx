import { ReactNode } from 'react';
import { Camera } from './camera';

// The board itself: a world-pixel-sized canvas, CSS-scaled to fit the
// viewport. Everything inside is positioned in world pixels (use <Sprite>),
// so children never deal with the scale. The map's background art, grid,
// spotlight and sprites all live in here as children.
export function Stage({
  camera,
  className,
  children,
}: {
  camera: Camera;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`relative shrink-0 ${className ?? ''}`}
      style={{
        width: camera.width,
        height: camera.height,
        transform: `scale(${camera.scale})`,
      }}
    >
      {children}
    </div>
  );
}
