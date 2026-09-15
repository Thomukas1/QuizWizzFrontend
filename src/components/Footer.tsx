import { SocialLinks } from '../primitives/SocialLinks';

interface FooterProps {
  socials?: Record<string, string>;
}

export function Footer({ socials }: FooterProps) {
  return (
    <footer className="flex flex-col gap-md">
      <hr className="border-divider" />
      {socials && <SocialLinks socials={socials} className="justify-center" />}
      <p className="text-center text-sm subtle">SlopBop © 2026</p>
    </footer>
  );
}
