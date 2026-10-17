import { useState } from "react";
import ActionCard, { OutcomeMessage } from "../../components/example/ActionCard";
import { useAction } from "../../components/example/useAction";
import CodeBlock from "../../components/CodeBlock";
import ExampleLayout from "../../components/example/ExampleLayout";
import Field from "../../components/example/Field";
import { useDemoUser } from "../../lib/demoUser";
import { createClient } from "../../lib/http";
import { createRequestLog } from "../../lib/requestLog";
import { createJwtClient, useAccessToken } from "../jwt/client";

const keyLog = createRequestLog();
/** The human side: an admin managing keys with a JWT. Reuses the JWT module as-is. */
const admin = createJwtClient(keyLog);
/** The machine side: no token, no cookies. Only the x-api-key header. */
const machine = createClient(keyLog);

const PERMISSIONS = ["profile:read", "orders:read"];
const EXPIRY = [
  { label: "Never", ms: 0 },
  { label: "1 minute", ms: 60_000 },
  { label: "1 day", ms: 86_400_000 },
];

interface KeyRecord {
  _id: string;
  name: string;
  permissions: string[];
  expiresAt: string | null;
  revoked: boolean;
  createdAt: string;
}

const ManageKeysCard = ({ onRotated }: { onRotated: (key: string) => void }) => {
  const [keys, setKeys] = useState<KeyRecord[]>([]);
  const { busy, outcome, run } = useAction();

  const load = () =>
    run(async () => {
      const res = await admin.api.get("/api-keys");
      setKeys(res.data.apiKeys);
      return `${res.data.count} key(s). Note there is no keyHash and no raw key in this list.`;
    });

  const rotate = (id: string) =>
    run(async () => {
      const res = await admin.api.post(`/api-keys/${id}/rotate`);
      onRotated(res.data.apiKey);
      const list = await admin.api.get("/api-keys");
      setKeys(list.data.apiKeys);
      return "Rotated. The new key was placed in step 4; the old one is now revoked.";
    });

  const revoke = (id: string) =>
    run(async () => {
      const res = await admin.api.patch(`/api-keys/${id}/revoke`);
      const list = await admin.api.get("/api-keys");
      setKeys(list.data.apiKeys);
      return `${res.data.message}. Use it in step 4 to see 401.`;
    });

  return (
    <ActionCard step={5} title="Manage keys: list, rotate, revoke" endpoint="GET /api-keys" notice="Rotate or revoke a key, then go back to step 4 with the old key: 401 Invalid API key.">
      <div className="action__buttons">
        <button type="button" className="btn" onClick={load} disabled={busy}>
          {busy ? "Loading…" : "Load my keys"}
        </button>
      </div>
      {keys.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Permissions</th>
                <th>Expires</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key._id}>
                  <td>{key.name}</td>
                  <td>{key.permissions.join(", ") || "none"}</td>
                  <td>{key.expiresAt ? new Date(key.expiresAt).toLocaleString() : "never"}</td>
                  <td>
                    <span className={`pill ${key.revoked ? "pill--off" : "pill--on"}`}>{key.revoked ? "revoked" : "active"}</span>
                  </td>
                  <td className="table__actions">
                    {!key.revoked && (
                      <>
                        <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => rotate(key._id)}>
                          Rotate
                        </button>
                        <button type="button" className="btn btn--danger btn--sm" disabled={busy} onClick={() => revoke(key._id)}>
                          Revoke
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <OutcomeMessage outcome={outcome} />
    </ActionCard>
  );
};

const UseKeyCard = ({ apiKey, setApiKey }: { apiKey: string; setApiKey: (key: string) => void }) => {
  const { busy, outcome, run } = useAction();

  const call = (path: string, withKey = true) =>
    run(async () => {
      const res = await machine.get(path, { headers: withKey ? { "x-api-key": apiKey } : {} });
      return `${res.data.message}. Permissions on this key: ${res.data.apiKey.permissions.join(", ") || "none"}`;
    });

  return (
    <ActionCard
      step={4}
      title="Call the API as a machine"
      notice="This client has no JWT and no cookies, only the x-api-key header. A key without 'profile:read' passes /api-keys/profile but gets 403 on /external/profile."
    >
      <Field label="x-api-key" value={apiKey} onChange={setApiKey} placeholder="ak_…" />
      <div className="action__buttons">
        <button type="button" className="btn" disabled={busy || !apiKey} onClick={() => call("/api-keys/profile")}>
          GET /api-keys/profile <small>any valid key</small>
        </button>
        <button type="button" className="btn btn--ghost" disabled={busy || !apiKey} onClick={() => call("/external/profile")}>
          GET /external/profile <small>needs profile:read</small>
        </button>
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => call("/api-keys/profile", false)}>
          Without the header
        </button>
      </div>
      <OutcomeMessage outcome={outcome} />
      <CodeBlock
        file="How a real integration would call it"
        code={`curl http://localhost:5000/api/api-keys/profile \\
  -H "x-api-key: ${apiKey || "ak_your_key_here"}"`}
      />
    </ActionCard>
  );
};

const ApiKeyExample = () => {
  const [demo, setDemo] = useDemoUser();
  const token = useAccessToken(admin.tokens);
  const [name, setName] = useState("reporting-service");
  const [permissions, setPermissions] = useState<string[]>(["profile:read"]);
  const [expiry, setExpiry] = useState(0);
  const [createdKey, setCreatedKey] = useState("");
  const [apiKey, setApiKey] = useState("");

  const status = (
    <div className="status-grid">
      <div>
        <span className="status-grid__label">Admin (human) session</span>
        <strong>{token ? "Logged in with a JWT" : "Not logged in"}</strong>
      </div>
      <div>
        <span className="status-grid__label">Key the machine uses</span>
        <code>{apiKey ? `${apiKey.slice(0, 12)}…${apiKey.slice(-6)}` : "none yet"}</code>
      </div>
    </div>
  );

  return (
    <ExampleLayout log={keyLog} status={status}>
      <ActionCard
        step={1}
        title="Log in as a human (JWT)"
        endpoint="POST /auth/jwt/login"
        runLabel="Log in"
        onRun={async () => `${(await admin.login(demo.email, demo.password)).message}. Register on the Session or JWT tab first if needed.`}
      >
        <Field label="Email" type="email" value={demo.email} onChange={(email) => setDemo({ email })} />
        <Field label="Password" type="password" value={demo.password} onChange={(password) => setDemo({ password })} autoComplete="current-password" />
      </ActionCard>

      <ActionCard
        step={2}
        title="Become an admin (demo only)"
        endpoint="PATCH /auth/role"
        runLabel="Promote me"
        disabled={!token}
        onRun={async () => (await admin.api.patch("/auth/role", { role: "admin" })).data.message}
        notice="Creating keys requires requiredRole('admin'). Skip this step once to see the 403."
      />

      <ActionCard
        step={3}
        title="Create an API key"
        endpoint="POST /api-keys"
        runLabel="Create key"
        disabled={!token}
        onRun={async () => {
          const res = await admin.api.post("/api-keys", {
            name,
            permissions,
            expiresAt: expiry ? new Date(Date.now() + expiry).toISOString() : null,
          });
          setCreatedKey(res.data.apiKey);
          setApiKey(res.data.apiKey);
          return res.data.message;
        }}
      >
        <Field label="Key name" value={name} onChange={setName} />
        <fieldset className="checks">
          <legend>Permissions</legend>
          {PERMISSIONS.map((permission) => (
            <label key={permission} className="toggle">
              <input
                type="checkbox"
                checked={permissions.includes(permission)}
                onChange={(event) =>
                  setPermissions((current) =>
                    event.target.checked ? [...current, permission] : current.filter((p) => p !== permission)
                  )
                }
              />
              {permission}
            </label>
          ))}
        </fieldset>
        <label className="field">
          <span>Expires</span>
          <select value={expiry} onChange={(event) => setExpiry(Number(event.target.value))}>
            {EXPIRY.map((option) => (
              <option key={option.label} value={option.ms}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {createdKey && (
          <div className="once">
            <strong>Copy this key now. It will never be shown again.</strong>
            <CodeBlock file="raw API key (server stored only its SHA-256)" code={createdKey} />
          </div>
        )}
      </ActionCard>

      <UseKeyCard apiKey={apiKey} setApiKey={setApiKey} />
      <ManageKeysCard onRotated={setApiKey} />
    </ExampleLayout>
  );
};

export default ApiKeyExample;
