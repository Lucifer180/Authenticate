import { useEffect, useState } from "react";
import { decodeJwt } from "../../lib/jwt";

const useNow = (enabled: boolean) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [enabled]);
  return now;
};

const formatSeconds = (total: number) => {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
};

/** Shows a JWT the way jwt.io does: three coloured parts, decoded below. */
interface Props {
  token: string | null;
  /** Name of the signing secret shown in the signature explanation. */
  secretName?: string;
  /** What happens when the token expires (differs per auth type). */
  expiredText?: string;
}

const TokenView = ({
  token,
  secretName = "JWT_ACCESS_SECRET",
  expiredText = "Expired: the next API call will get 401 and trigger a refresh.",
}: Props) => {
  const decoded = token ? decodeJwt(token) : null;
  const now = useNow(Boolean(decoded?.payload.exp));

  if (!token) {
    return <p className="token__empty">No access token in memory. Log in to get one.</p>;
  }
  if (!decoded) {
    return <p className="token__empty">The value in memory is not a valid JWT.</p>;
  }

  const secondsLeft = decoded.payload.exp ? Math.max(0, Math.round(decoded.payload.exp - now / 1000)) : null;

  return (
    <div className="token">
      <code className="token__raw">
        <span className="token__h">{decoded.parts[0]}</span>.<span className="token__p">{decoded.parts[1]}</span>.
        <span className="token__s">{decoded.parts[2]}</span>
      </code>
      <div className="token__grid">
        <div>
          <h5 className="token__h">Header</h5>
          <pre>{JSON.stringify(decoded.header, null, 2)}</pre>
        </div>
        <div>
          <h5 className="token__p">Payload (readable by anyone)</h5>
          <pre>{JSON.stringify(decoded.payload, null, 2)}</pre>
        </div>
        <div>
          <h5 className="token__s">Signature</h5>
          <p>HMAC-SHA256(header + "." + payload, {secretName}). Only the server can produce or check it.</p>
        </div>
      </div>
      {secondsLeft !== null && (
        <p className={`token__exp ${secondsLeft === 0 ? "is-expired" : ""}`}>
          {secondsLeft === 0
            ? expiredText
            : `Expires in ${formatSeconds(secondsLeft)}`}
        </p>
      )}
    </div>
  );
};

export default TokenView;
