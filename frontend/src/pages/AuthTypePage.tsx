import { Link, Navigate, NavLink, useParams, useSearchParams } from "react-router-dom";
import { findAuthType } from "../auth-types/registry";
import type { AuthTypeDefinition } from "../auth-types/types";
import FlowChart from "../components/flow/FlowChart";
import { API_BASE_URL } from "../lib/http";

const SECTIONS = [
  { id: "architecture", label: "Architecture" },
  { id: "flows", label: "Flows" },
  { id: "example", label: "Try it" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const ArchitectureSection = ({ type }: { type: AuthTypeDefinition }) => {
  const { architecture } = type;
  return (
    <div className="stack">
      <p className="lead">{type.summary}</p>

      <div className="triple">
        <div className="card">
          <h4>Use it when</h4>
          <ul>{type.whenToUse.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div className="card card--good">
          <h4>Strengths</h4>
          <ul>{type.pros.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div className="card card--warn">
          <h4>Trade-offs</h4>
          <ul>{type.cons.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </div>

      <section>
        <h3 className="section-title">{architecture.diagram.title}</h3>
        <p className="muted">{architecture.diagram.summary} Press play or click a box to see what each layer does.</p>
        <FlowChart flow={architecture.diagram} height={420} />
      </section>

      <section>
        <h3 className="section-title">Where each piece lives in the code</h3>
        <div className="table-wrap">
          <table className="table">
            <tbody>
              {architecture.files.map((file) => (
                <tr key={file.path}>
                  <td><code>{file.path}</code></td>
                  <td>{file.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="section-title">Where the auth state is kept</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>What</th>
                <th>Where</th>
                <th>Why there</th>
              </tr>
            </thead>
            <tbody>
              {architecture.state.map((row) => (
                <tr key={row.what}>
                  <td><b>{row.what}</b></td>
                  <td>{row.where}</td>
                  <td>{row.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="section-title">Design decisions to copy</h3>
        <div className="decision-grid">
          {architecture.decisions.map((decision) => (
            <div key={decision.title} className="card">
              <h4>{decision.title}</h4>
              <p>{decision.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const FlowsSection = ({ type }: { type: AuthTypeDefinition }) => {
  const [params, setParams] = useSearchParams();
  const flow = type.flows.find((f) => f.id === params.get("flow")) ?? type.flows[0];

  return (
    <div className="stack">
      <div className="flow-tabs" role="tablist" aria-label="Flows">
        {type.flows.map((f, index) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={f.id === flow.id}
            className={`flow-tab ${f.id === flow.id ? "is-active" : ""}`}
            onClick={() => setParams({ flow: f.id }, { replace: true })}
          >
            <span className="flow-tab__num">{index + 1}</span>
            {f.title}
          </button>
        ))}
      </div>
      <div>
        <h3 className="section-title">{flow.title}</h3>
        <p className="muted">{flow.summary}</p>
      </div>
      <FlowChart flow={flow} />
    </div>
  );
};

const ExampleSection = ({ type }: { type: AuthTypeDefinition }) => (
  <div className="stack">
    <div className="callout">
      <b>This example calls the real backend</b> at <code>{API_BASE_URL}</code>. Start it with{" "}
      <code>cd Backend &amp;&amp; npm run dev</code>. Work through the steps top to bottom and watch the network inspector
      on the right.
    </div>
    <type.Example />
  </div>
);

const AuthTypePage = () => {
  const { typeId, section } = useParams();
  const type = findAuthType(typeId);

  if (!type) return <Navigate to="/" replace />;
  if (!SECTIONS.some((s) => s.id === section)) return <Navigate to={`/learn/${type.id}/architecture`} replace />;

  const current = section as SectionId;
  const index = SECTIONS.findIndex((s) => s.id === current);
  const next = SECTIONS[index + 1];

  return (
    <div className="type-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">All types</Link> <span aria-hidden>/</span> <span>{type.name}</span>
      </nav>
      <header className="type-page__head">
        <span className={`type-card__badge type-card__badge--lg type-card--${type.id}`}>{type.short}</span>
        <div>
          <h1>{type.name}</h1>
          <p className="muted">{type.tagline}</p>
        </div>
      </header>

      <nav className="stepper" aria-label="Sections">
        {SECTIONS.map((s, i) => (
          <NavLink key={s.id} to={`/learn/${type.id}/${s.id}`} className={({ isActive }) => `stepper__item ${isActive ? "is-active" : ""} ${i < index ? "is-done" : ""}`}>
            <span className="stepper__num">{i + 1}</span>
            {s.label}
          </NavLink>
        ))}
      </nav>

      {current === "architecture" && <ArchitectureSection type={type} />}
      {current === "flows" && <FlowsSection type={type} />}
      {current === "example" && <ExampleSection type={type} />}

      {next && (
        <div className="next">
          <Link className="btn btn--lg" to={`/learn/${type.id}/${next.id}`}>
            Next: {next.label} →
          </Link>
        </div>
      )}
    </div>
  );
};

export default AuthTypePage;
