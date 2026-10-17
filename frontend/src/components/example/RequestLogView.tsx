import { useState } from "react";
import { useRequestLog, type LogEntry, type RequestLog } from "../../lib/requestLog";

const SECRET_FIELDS = ["password"];

/** Hide passwords in the log, but keep everything else visible for learning. */
const mask = (value: unknown): unknown => {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(mask);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, v]) =>
      SECRET_FIELDS.includes(key) ? [key, "••••••••"] : [key, mask(v)]
    )
  );
};

const parseBody = (body: unknown) => {
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
};

const shorten = (value: string) => (value.length > 46 ? `${value.slice(0, 30)}…${value.slice(-10)}` : value);

const statusClass = (entry: LogEntry) => {
  if (entry.error) return "status--fail";
  if (!entry.status) return "status--pending";
  if (entry.status < 300) return "status--ok";
  if (entry.status < 500) return "status--warn";
  return "status--fail";
};

const Entry = ({ entry }: { entry: LogEntry }) => {
  const [open, setOpen] = useState(false);
  const body = mask(parseBody(entry.body));

  return (
    <li className="log__entry">
      <button className="log__summary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={`method method--${entry.method.toLowerCase()}`}>{entry.method}</span>
        <span className="log__url">{entry.url}</span>
        <span className={`status ${statusClass(entry)}`}>{entry.error ? "ERR" : entry.status ?? "…"}</span>
      </button>

      <div className="log__chips">
        {Object.entries(entry.headers).map(([name, value]) => (
          <span key={name} className="chip chip--header" title={value}>
            {name}: {shorten(value)}
          </span>
        ))}
        {entry.sendsCookies && <span className="chip chip--cookie">cookies sent by browser</span>}
        {!entry.sendsCookies && Object.keys(entry.headers).length === 0 && (
          <span className="chip chip--muted">no credentials</span>
        )}
        {entry.durationMs !== undefined && <span className="chip chip--muted">{entry.durationMs} ms</span>}
      </div>

      {entry.note && <p className="log__note">{entry.note}</p>}
      {entry.error && <p className="log__error">{entry.error}</p>}
      {!open && entry.response !== undefined && (
        <p className="log__message">
          {String((entry.response as { message?: string } | undefined)?.message ?? "")}
        </p>
      )}

      {open && (
        <div className="log__details">
          {body !== undefined && (
            <>
              <h5>Request body</h5>
              <pre>{JSON.stringify(body, null, 2)}</pre>
            </>
          )}
          <h5>Response</h5>
          <pre>{entry.response === undefined ? "(none)" : JSON.stringify(entry.response, null, 2)}</pre>
        </div>
      )}
    </li>
  );
};

const RequestLogView = ({ log }: { log: RequestLog }) => {
  const entries = useRequestLog(log);

  return (
    <section className="log" aria-label="Network inspector">
      <header className="log__head">
        <div>
          <h4>Network inspector</h4>
          <p>Every request this example sends, newest first. Click one to see the full body.</p>
        </div>
        {entries.length > 0 && (
          <button className="btn btn--ghost btn--sm" onClick={log.clear}>
            Clear
          </button>
        )}
      </header>
      {entries.length === 0 ? (
        <p className="log__empty">Nothing sent yet. Try the first step on the left.</p>
      ) : (
        <ol className="log__list">
          {entries.map((entry) => (
            <Entry key={entry.id} entry={entry} />
          ))}
        </ol>
      )}
    </section>
  );
};

export default RequestLogView;
