import { Link } from "react-router-dom";
import { authTypes, plannedAuthTypes } from "../auth-types/registry";

const COMPARISON = [
  { label: "Proof of identity", session: "Session id in httpOnly cookie", jwt: "Signed JWT in Authorization header", "api-key": "Random secret in x-api-key header" },
  { label: "State on the server", session: "Session record per login", jwt: "Only refresh-token hashes", "api-key": "Key hash + permissions" },
  { label: "Instant revocation", session: "Yes: delete the session", jwt: "Refresh only; access token lives until exp", "api-key": "Yes: revoked flag" },
  { label: "Typical caller", session: "Browser on a trusted origin", jwt: "SPA, mobile app, microservices", "api-key": "Another server or script" },
] as const;

const HomePage = () => (
  <div className="home">
    <section className="hero">
      <p className="eyebrow">Authentication architecture, one pattern at a time</p>
      <h1>Pick an authentication type. See how it is built. Then run it.</h1>
      <p className="hero__lead">
        Every type follows the same three steps: the <b>architecture</b> (which layer does what), the <b>flows</b> as
        interactive flowcharts tied to the real backend code, and a live <b>example</b> that talks to the Express API
        while showing every request.
      </p>
      <ol className="hero__steps">
        <li>
          <span>1</span>Choose a type
        </li>
        <li>
          <span>2</span>Understand the architecture
        </li>
        <li>
          <span>3</span>Walk through the flows
        </li>
        <li>
          <span>4</span>Try the live example
        </li>
      </ol>
    </section>

    <section aria-labelledby="types-heading">
      <h2 id="types-heading" className="section-title">
        Available now
      </h2>
      <div className="type-grid">
        {authTypes.map((type) => (
          <Link key={type.id} to={`/learn/${type.id}/architecture`} className={`type-card type-card--${type.id}`}>
            <span className="type-card__badge">{type.short}</span>
            <h3>{type.name}</h3>
            <p>{type.tagline}</p>
            <span className="type-card__meta">
              {type.flows.length} flows · live example
            </span>
            <span className="type-card__cta">Start →</span>
          </Link>
        ))}
      </div>
    </section>

    <section aria-labelledby="compare-heading">
      <h2 id="compare-heading" className="section-title">
        At a glance
      </h2>
      <div className="table-wrap">
        <table className="table table--compare">
          <thead>
            <tr>
              <th />
              {authTypes.map((type) => (
                <th key={type.id}>{type.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {authTypes.map((type) => (
                  <td key={type.id}>{row[type.id as "session" | "jwt" | "api-key"] ?? "–"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    <section aria-labelledby="planned-heading">
      <h2 id="planned-heading" className="section-title">
        Coming next
      </h2>
      <div className="type-grid type-grid--planned">
        {plannedAuthTypes.map((type) => (
          <div key={type.id} className="type-card type-card--planned" aria-disabled>
            <span className="type-card__badge">{type.short}</span>
            <h3>{type.name}</h3>
            <p>{type.tagline}</p>
            <span className="type-card__meta">Planned</span>
          </div>
        ))}
      </div>
    </section>
  </div>
);

export default HomePage;
