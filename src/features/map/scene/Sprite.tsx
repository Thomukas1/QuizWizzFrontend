import { ReactNode } from 'react';
import { Camera, Tile } from './camera';

// A thing placed on the board at a tile. The camera projects the tile to a
// pixel; the sprite centres its child over that point. Children are pure
// presentation — an icon, an avatar, a button — and never touch coordinates.
//
// `glide` animates the move when the tile changes between renders, so an
// entity that hops to a new tile slides there instead of teleporting.
export function Sprite({
  camera,
  tile,
  z,
  glide = false,
  className,
  children,
}: {
  camera: Camera;
  tile: Tile;
  z?: number;
  glide?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const { left, top } = camera.project(tile);

  return (
    <div
      className={`absolute -translate-x-1/2 -translate-y-1/2 ${
        glide ? 'transition-[left,top] duration-700 ease-in-out' : ''
      } ${className ?? ''}`}
      style={{ left, top, zIndex: z }}
    >
      {children}
    </div>
  );
}
