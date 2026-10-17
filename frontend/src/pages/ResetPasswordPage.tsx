import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import ActionCard from "../components/example/ActionCard";
import Field from "../components/example/Field";
import { sessionApi } from "../auth-types/session/client";

/** Target of the link in the password-reset email: FRONTEND_URL/reset-password/:token */
const ResetPasswordPage = () => {
  const { token = "" } = useParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  return (
    <div className="narrow">
      <h1>Choose a new password</h1>
      <p className="muted">
        You arrived from the reset email. The token in the URL is sent to the server, which hashes it and looks it up.
        See the <Link to="/learn/session/flows?flow=reset">reset flowchart</Link>.
      </p>
      <ol className="example__steps">
        <ActionCard
          step={1}
          title="Reset password"
          endpoint="POST /auth/reset-password/:token"
          runLabel="Reset password"
          onRun={async () => {
            if (password !== confirm) throw new Error("Passwords do not match");
            const res = await sessionApi.post(`/auth/reset-password/${token}`, { password });
            return `${res.data.message}. Every existing session for this account has been logged out.`;
          }}
        >
          <Field label="New password (min 8)" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
          <Field label="Confirm password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </ActionCard>
      </ol>
      <p>
        <Link to="/learn/session/example">Back to the session example →</Link>
      </p>
    </div>
  );
};

export default ResetPasswordPage;
