import { useEffect, useState } from "react";
import ActionCard from "../../components/example/ActionCard";
import ExampleLayout from "../../components/example/ExampleLayout";
import Field from "../../components/example/Field";
import { useDemoUser } from "../../lib/demoUser";
import { sessionApi, sessionLog, type PublicUser } from "./client";

const SessionExample = () => {
  const [demo, setDemo] = useDemoUser();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [cookieView, setCookieView] = useState(document.cookie);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Refresh the "what can JavaScript see" panel after every request.
  useEffect(() => sessionLog.subscribe(() => setCookieView(document.cookie)), []);

  const status = (
    <div className="status-grid">
      <div>
        <span className="status-grid__label">Server thinks you are</span>
        <strong>{user ? `${user.name} (${user.role})` : "Anonymous"}</strong>
      </div>
      <div>
        <span className="status-grid__label">What JavaScript can read: document.cookie</span>
        <code>{cookieView || '"" (empty)'}</code>
      </div>
      <p className="status-grid__note">
        After login, the <code>connect.sid</code> cookie exists, but it is <b>httpOnly</b>, so it never shows up here.
        Open DevTools → Application → Cookies → localhost to see it.
      </p>
    </div>
  );

  return (
    <ExampleLayout log={sessionLog} status={status}>
      <ActionCard
        step={1}
        title="Create an account"
        endpoint="POST /auth/register"
        runLabel="Register"
        onRun={async () => {
          const res = await sessionApi.post("/auth/register", demo);
          return res.data.message;
        }}
        notice="Look at the response: no password, no hash. In MongoDB the password field now starts with $2b$12$ (bcrypt, cost 12)."
      >
        <Field label="Name" value={demo.name} onChange={(name) => setDemo({ name })} />
        <Field label="Email" type="email" value={demo.email} onChange={(email) => setDemo({ email })} />
        <Field
          label="Password (min 8)"
          type="password"
          value={demo.password}
          onChange={(password) => setDemo({ password })}
          autoComplete="new-password"
        />
      </ActionCard>

      <ActionCard
        step={2}
        title="Log in"
        endpoint="POST /auth/login"
        runLabel="Log in"
        onRun={async () => {
          const res = await sessionApi.post("/auth/login", { email: demo.email, password: demo.password });
          setUser(res.data.user);
          return `${res.data.message}. The response set a Set-Cookie header.`;
        }}
        notice="Try a wrong password too: you get the same '401 Invalid credentials' as for an unknown email."
      >
        <Field label="Email" type="email" value={demo.email} onChange={(email) => setDemo({ email })} />
        <Field
          label="Password"
          type="password"
          value={demo.password}
          onChange={(password) => setDemo({ password })}
          autoComplete="current-password"
        />
      </ActionCard>

      <ActionCard
        step={3}
        title="Call a protected route"
        endpoint="GET /auth/me"
        runLabel="Who am I?"
        onRun={async () => {
          try {
            const res = await sessionApi.get("/auth/me");
            setUser(res.data.user);
            return `requireAuth found your session: ${res.data.user.email}`;
          } catch (error) {
            setUser(null);
            throw error;
          }
        }}
        notice="The inspector shows no Authorization header, only 'cookies sent by browser'. Reload this page and run it again: you are still logged in, because the session lives on the server."
      />

      <ActionCard
        step={4}
        title="Log out"
        endpoint="POST /auth/logout"
        runLabel="Log out"
        onRun={async () => {
          const res = await sessionApi.post("/auth/logout");
          setUser(null);
          return res.data.message;
        }}
        notice="Now run step 3 again: 401. The session document was deleted, so the old cookie points at nothing."
      />

      <ActionCard
        step={5}
        title="Forgot password"
        endpoint="POST /auth/forgot-password"
        runLabel="Send reset link"
        onRun={async () => {
          const res = await sessionApi.post("/auth/forgot-password", { email: demo.email });
          const token = res.data.data?.resetPasswordToken;
          if (token) setResetToken(token);
          return token
            ? "Reset link emailed. This dev backend also returned the raw token, so it was filled in below."
            : res.data.message;
        }}
        notice={
          <>
            Log in first (step 2) if you want to see <b>log out everywhere</b> in action: after the reset in step 6,
            step 3 answers <code>401 Session expired</code> because <code>sessionVersion</code> changed.
          </>
        }
      >
        <Field label="Email" type="email" value={demo.email} onChange={(email) => setDemo({ email })} />
      </ActionCard>

      <ActionCard
        step={6}
        title="Reset password with the token"
        endpoint="POST /auth/reset-password/:token"
        runLabel="Reset password"
        disabled={!resetToken}
        onRun={async () => {
          const res = await sessionApi.post(`/auth/reset-password/${resetToken}`, { password: newPassword });
          setDemo({ password: newPassword });
          return `${res.data.message}. Your new password is now remembered for the other steps.`;
        }}
        notice="Send the same token twice: the second attempt fails, because the token is cleared after use (single-use)."
      >
        <Field label="Reset token" value={resetToken} onChange={setResetToken} placeholder="from step 5 or the email link" />
        <Field
          label="New password (min 8)"
          type="password"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
        />
      </ActionCard>
    </ExampleLayout>
  );
};

export default SessionExample;
