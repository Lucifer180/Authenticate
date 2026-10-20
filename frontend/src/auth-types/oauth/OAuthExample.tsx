import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ActionCard, { OutcomeMessage } from "../../components/example/ActionCard";
import ExampleLayout from "../../components/example/ExampleLayout";
import { useAction } from "../../components/example/useAction";
import { API_BASE_URL, createClient } from "../../lib/http";
import { tamperJwt } from "../../lib/jwt";
import { createRequestLog } from "../../lib/requestLog";
import TokenView from "../jwt/TokenView";

const oauthLog = createRequestLog();
/** Variant A: the session cookie is sent automatically. */
const sessionApi = createClient(oauthLog, { withCredentials: true });
/** Variant B: only the Bearer header, no cookies. */
const jwtApi = createClient(oauthLog);

interface GoogleUser {
  id: string;
  name?: string;
  email?: string;
}

interface FragmentLogin {
  token: string;
  name: string;
  email: string;
}

/**
 * The JWT callback hands the token over in the URL fragment:
 *   /learn/oauth/example?login=google-jwt#access_token=...&name=...&email=...
 * Read it once on load; the effect below erases it from the address bar.
 */
const readFragment = (): FragmentLogin | null => {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get("access_token");
  return token ? { token, name: params.get("name") ?? "", email: params.get("email") ?? "" } : null;
};

const RedirectTimeline = () => (
  <ActionCard
    title="What happens when you click 'Sign in with Google'"
    notice="These hops are full-page redirects, not fetch() calls, so they do not appear in the network inspector. Open DevTools → Network with 'Preserve log' on to watch them."
  >
    <ol className="timeline">
      <li><b>Your app → API</b> <code>GET /api/auth/google</code>: sets the <code>state</code> cookie, answers 302.</li>
      <li><b>API → Google</b> login and consent page (your password goes to Google only).</li>
      <li><b>Google → API</b> <code>/callback?code=…&amp;state=…</code>: state check, code exchange, ID-token verification.</li>
      <li><b>API → your app</b> back here, with a session cookie (variant A) or a JWT in the <code>#fragment</code> (variant B).</li>
    </ol>
  </ActionCard>
);

const OAuthExample = () => {
  const [params, setParams] = useSearchParams();
  const [sessionUser, setSessionUser] = useState<GoogleUser | null>(null);
  const [jwtLogin, setJwtLogin] = useState<FragmentLogin | null>(readFragment);
  const sessionMe = useAction();
  const jwtMe = useAction();
  const oauthError = params.get("oauth_error");
  const login = params.get("login");

  const fetchSessionUser = () =>
    sessionMe.run(async () => {
      try {
        const res = await sessionApi.get("/auth/google/me");
        setSessionUser(res.data.user);
        return `${res.data.message}: ${res.data.user.email}`;
      } catch (error) {
        setSessionUser(null);
        throw error;
      }
    });

  // Coming back from Google: erase the token from the address bar and check the session.
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }
    if (login === "google-session") fetchSessionUser();
    if (login) {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.delete("login");
          return next;
        },
        { replace: true }
      );
    }
    // Run once per return from Google.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [login]);

  const callJwtMe = (token: string | undefined) =>
    jwtMe.run(async () => {
      const res = await jwtApi.get("/auth/google/jwt/me", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return `${res.data.message} (user ${res.data.user.id}, provider ${res.data.user.authProvider})`;
    });

  const status = (
    <div className="status-grid">
      <div>
        <span className="status-grid__label">Variant A: Google + session</span>
        <strong>{sessionUser ? `${sessionUser.name || sessionUser.email} (cookie)` : "Not signed in"}</strong>
      </div>
      <div>
        <span className="status-grid__label">Variant B: Google + app JWT</span>
        <strong>{jwtLogin ? `${jwtLogin.name || jwtLogin.email} (token in memory)` : "No token"}</strong>
      </div>
      <p className="status-grid__note">
        Needs <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code> and both callback URLs registered as
        Authorized redirect URIs in Google Cloud Console.
      </p>
    </div>
  );

  return (
    <ExampleLayout log={oauthLog} status={status}>
      {oauthError && (
        <li>
          <p className="outcome outcome--error" role="alert">
            Google sign-in failed: {oauthError}
          </p>
        </li>
      )}

      <RedirectTimeline />

      <ActionCard
        step={1}
        title="Sign in with Google → server session"
        endpoint="GET /auth/google"
        notice="You will leave this page and come back here. The API then checks /auth/google/me automatically."
      >
        <div className="action__buttons">
          <a className="btn" href={`${API_BASE_URL}/auth/google`}>
            Sign in with Google (session)
          </a>
        </div>
      </ActionCard>

      <ActionCard
        step={2}
        title="Who am I? (session cookie)"
        endpoint="GET /auth/google/me"
        notice="Same as the Session type: no Authorization header, only the cookie. Google is no longer involved."
      >
        <div className="action__buttons">
          <button type="button" className="btn" disabled={sessionMe.busy} onClick={fetchSessionUser}>
            {sessionMe.busy ? "Sending…" : "Check session"}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={sessionMe.busy}
            onClick={() =>
              sessionMe.run(async () => {
                const res = await sessionApi.post("/auth/google/logout");
                setSessionUser(null);
                return res.data.message;
              })
            }
          >
            Log out
          </button>
        </div>
        <OutcomeMessage outcome={sessionMe.outcome} />
      </ActionCard>

      <ActionCard
        step={3}
        title="Sign in with Google → application JWT"
        endpoint="GET /auth/google/jwt"
        notice="After Google, the API signs its own JWT and redirects back with it in the #fragment. This page reads it and immediately removes it from the address bar."
      >
        <div className="action__buttons">
          <a className="btn" href={`${API_BASE_URL}/auth/google/jwt`}>
            Sign in with Google (JWT)
          </a>
        </div>
        {jwtLogin && (
          <TokenView
            token={jwtLogin.token}
            secretName="GOOGLE_APP_JWT_SECRET"
            expiredText="Expired: this variant has no refresh token, so sign in with Google again."
          />
        )}
      </ActionCard>

      <ActionCard
        step={4}
        title="Call the API with the app JWT"
        endpoint="GET /auth/google/jwt/me"
        notice={
          <>
            Note the claims above: <code>iss</code> and <code>aud</code> are checked too, and this is <b>your</b> token,
            not Google's. Tampering with <code>sub</code> breaks the signature: 401.
          </>
        }
      >
        <div className="action__buttons">
          <button type="button" className="btn" disabled={jwtMe.busy || !jwtLogin} onClick={() => callJwtMe(jwtLogin?.token)}>
            {jwtMe.busy ? "Sending…" : "Call with token"}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={jwtMe.busy || !jwtLogin}
            onClick={() => jwtLogin && callJwtMe(tamperJwt(jwtLogin.token, { sub: "000000000000000000000000" }))}
          >
            Tamper with sub
          </button>
          <button type="button" className="btn btn--ghost" disabled={jwtMe.busy} onClick={() => callJwtMe(undefined)}>
            Without a token
          </button>
          {jwtLogin && (
            <button type="button" className="btn btn--ghost" onClick={() => setJwtLogin(null)}>
              Forget token
            </button>
          )}
        </div>
        <OutcomeMessage outcome={jwtMe.outcome} />
      </ActionCard>
    </ExampleLayout>
  );
};

export default OAuthExample;
