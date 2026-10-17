import { useState } from "react";
import ActionCard, { OutcomeMessage } from "../../components/example/ActionCard";
import { useAction } from "../../components/example/useAction";
import ExampleLayout from "../../components/example/ExampleLayout";
import Field from "../../components/example/Field";
import { useDemoUser } from "../../lib/demoUser";
import { tamperJwt } from "../../lib/jwt";
import { createRequestLog } from "../../lib/requestLog";
import { createJwtClient, useAccessToken } from "./client";
import TokenView from "./TokenView";

const jwtLog = createRequestLog();
const jwt = createJwtClient(jwtLog);

const BreakTokenCard = () => {
  const token = useAccessToken(jwt.tokens);
  const [autoRefresh, setAutoRefresh] = useState(jwt.options.autoRefresh);
  const { busy, outcome, run } = useAction();

  const callProfile = () =>
    run(async () => {
      const res = await jwt.api.get("/auth/jwtProfile");
      return `200 OK as ${res.data.user.email}`;
    });

  return (
    <ActionCard
      step={4}
      title="Break the token and watch the refresh"
      notice={
        <>
          With auto-refresh on, the inspector shows three requests: the failed call (401), <code>POST /auth/jwt/refresh</code>{" "}
          (rotates the refresh cookie) and the retried call. Turn it off to see the raw 401.
        </>
      }
    >
      <label className="toggle">
        <input
          type="checkbox"
          checked={autoRefresh}
          onChange={(event) => {
            jwt.options.autoRefresh = event.target.checked;
            setAutoRefresh(event.target.checked);
          }}
        />
        Auto-refresh on 401 (response interceptor)
      </label>
      <div className="action__buttons">
        <button
          type="button"
          className="btn btn--ghost"
          disabled={!token}
          onClick={() => token && jwt.tokens.set(tamperJwt(token, { role: "admin" }))}
        >
          Tamper: set role to "admin"
        </button>
        <button type="button" className="btn btn--ghost" disabled={!token} onClick={() => jwt.tokens.set(null)}>
          Forget access token (like a reload)
        </button>
        <button type="button" className="btn" disabled={busy} onClick={callProfile}>
          {busy ? "Sending…" : "Call GET /auth/jwtProfile"}
        </button>
      </div>
      <OutcomeMessage outcome={outcome} />
    </ActionCard>
  );
};

const AuthorizationCard = ({ userId }: { userId: string }) => {
  const [otherId, setOtherId] = useState("000000000000000000000000");
  const { busy, outcome, run } = useAction();

  const call = (label: string, request: () => Promise<{ data: { message?: string } }>) =>
    run(async () => {
      const res = await request();
      return `${label}: ${res.data.message ?? "200 OK"}`;
    });

  return (
    <ActionCard
      step={6}
      title="Authorization: 401 vs 403"
      notice={
        <>
          As a normal user the admin routes answer <b>403</b> (we know who you are, but you are not allowed). Promote
          yourself and try again. Note the role inside the old token does not matter: <code>requireAuthJWT</code> re-reads
          the user from MongoDB. (Self-promotion exists only for this demo; never ship it.)
        </>
      }
    >
      <div className="action__buttons">
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => call("Admin only", () => jwt.api.get("/auth/admin-only"))}>
          GET /auth/admin-only <small>role</small>
        </button>
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => call("users:delete", () => jwt.api.get("/auth/admin-user"))}>
          GET /auth/admin-user <small>permission</small>
        </button>
        <button type="button" className="btn btn--ghost" disabled={busy || !userId} onClick={() => call("Own resource", () => jwt.api.get(`/auth/users/${userId}`))}>
          GET /auth/users/&lt;my id&gt; <small>ownership</small>
        </button>
      </div>
      <div className="action__inline">
        <Field label="Someone else's user id" value={otherId} onChange={setOtherId} />
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => call("Other resource", () => jwt.api.get(`/auth/users/${otherId}`))}>
          GET /auth/users/&lt;other id&gt;
        </button>
      </div>
      <div className="action__buttons">
        <button type="button" className="btn" disabled={busy} onClick={() => call("Role change", () => jwt.api.patch("/auth/role", { role: "admin" }))}>
          Promote me to admin
        </button>
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => call("Role change", () => jwt.api.patch("/auth/role", { role: "user" }))}>
          Back to user
        </button>
      </div>
      <OutcomeMessage outcome={outcome} />
    </ActionCard>
  );
};

const JwtExample = () => {
  const [demo, setDemo] = useDemoUser();
  const token = useAccessToken(jwt.tokens);
  const [userId, setUserId] = useState("");

  const status = (
    <div className="status-grid status-grid--token">
      <div className="status-grid__row">
        <div>
          <span className="status-grid__label">Access token</span>
          <strong>In memory (a JS variable)</strong>
        </div>
        <div>
          <span className="status-grid__label">Refresh token</span>
          <strong>httpOnly cookie: JS cannot read it</strong>
        </div>
      </div>
      <TokenView token={token} />
    </div>
  );

  return (
    <ExampleLayout log={jwtLog} status={status}>
      <ActionCard
        step={1}
        title="Need an account? Register (same users as session auth)"
        endpoint="POST /auth/register"
        runLabel="Register"
        onRun={async () => (await jwt.api.post("/auth/register", demo, { _skipAuth: true })).data.message}
      >
        <Field label="Name" value={demo.name} onChange={(name) => setDemo({ name })} />
        <Field label="Email" type="email" value={demo.email} onChange={(email) => setDemo({ email })} />
        <Field label="Password (min 8)" type="password" value={demo.password} onChange={(password) => setDemo({ password })} autoComplete="new-password" />
      </ActionCard>

      <ActionCard
        step={2}
        title="Log in and receive two tokens"
        endpoint="POST /auth/jwt/login"
        runLabel="Log in"
        onRun={async () => {
          const data = await jwt.login(demo.email, demo.password);
          setUserId(data.user.id);
          return `${data.message}. The access token is decoded above.`;
        }}
        notice="Read the payload above: userId and role are plain JSON. Anyone can decode a JWT; the signature only stops them from changing it."
      >
        <Field label="Email" type="email" value={demo.email} onChange={(email) => setDemo({ email })} />
        <Field label="Password" type="password" value={demo.password} onChange={(password) => setDemo({ password })} autoComplete="current-password" />
      </ActionCard>

      <ActionCard
        step={3}
        title="Call a protected route with the Bearer token"
        endpoint="GET /auth/jwtProfile"
        runLabel="Get profile"
        onRun={async () => {
          const res = await jwt.api.get("/auth/jwtProfile");
          return `${res.data.message} for ${res.data.user.email}`;
        }}
        notice="In the inspector: an Authorization header, and no cookies. The server needs nothing but the token to know who you are."
      />

      <BreakTokenCard />

      <ActionCard
        step={5}
        title="Refresh manually"
        endpoint="POST /auth/jwt/refresh"
        runLabel="Refresh now"
        onRun={async () => {
          await jwt.refresh();
          return "New access token issued (see iat/exp above) and the refresh cookie was rotated.";
        }}
        notice="Each refresh replaces the stored refresh-token hash, so the previous cookie value can never be used again."
      />

      <AuthorizationCard userId={userId} />

      <ActionCard
        step={7}
        title="Log out"
        endpoint="POST /auth/jwt/logout"
        runLabel="Log out"
        onRun={async () => `${await jwt.logout()}. Refresh token deleted from MongoDB.`}
        notice="Now try 'Refresh now': 401. The refresh token record is gone, so no new access tokens can be issued."
      />
    </ExampleLayout>
  );
};

export default JwtExample;
