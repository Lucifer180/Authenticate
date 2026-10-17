import type { ReactNode } from "react";
import type { RequestLog } from "../../lib/requestLog";
import RequestLogView from "./RequestLogView";

interface Props {
  log: RequestLog;
  /** Live state shown above the steps (who is logged in, current token...). */
  status?: ReactNode;
  children: ReactNode;
}

const ExampleLayout = ({ log, status, children }: Props) => (
  <div className="example">
    <div className="example__main">
      {status && <div className="example__status">{status}</div>}
      <ol className="example__steps">{children}</ol>
    </div>
    <div className="example__side">
      <RequestLogView log={log} />
    </div>
  </div>
);

export default ExampleLayout;
