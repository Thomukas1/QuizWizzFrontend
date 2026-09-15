import { QRCodeSVG } from 'qrcode.react';
import { RoomCode } from './RoomCode';

/**
 * How the room gets in: a QR code, the URL under it for anyone whose camera
 * won't cooperate, and the code so everyone can confirm they're in the same game.
 *
 * It lives in the admin panel and stays there for the whole evening. That is the
 * point of it being here rather than on the lobby screen: a phone drops, a
 * battery dies, someone arrives late in round three — and the way back in
 * shouldn't have vanished with the lobby.
 *
 * **Fluid, not fixed.** `size` is the SVG's internal coordinate space; the CSS
 * scales it to whatever the panel is. A hardcoded pixel size looked right at
 * 1920 and overflowed the column on anything narrower.
 *
 * No logo in the middle of the code, deliberately: excavating one spends
 * error-correction budget, and this is read off a television in a dim room where
 * that budget is already going on the display.
 */
export function JoinPanel({ joinUrl, code }: { joinUrl: string; code: string | null }) {
  return (
    <div className="join-invite">
      <div className="join-invite__qr">
        <QRCodeSVG
          value={joinUrl}
          level="H"
          marginSize={2}
          size={512}
          bgColor="#FFFFFF"
          fgColor="#051648"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>

      <p className="join-invite__url">{joinUrl.replace(/^https?:\/\//, '')}</p>

      {code && <RoomCode code={code} size="clamp(18px, 1.5vw, 30px)" />}
    </div>
  );
}
