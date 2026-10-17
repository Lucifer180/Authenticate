import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { authTypes } from "../auth-types/registry";

const Layout = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand__mark" aria-hidden>
            ◆
          </span>
          Auth Architecture Lab
        </Link>
        <nav className="topbar__nav" aria-label="Authentication types">
          {authTypes.map((type) => (
            <NavLink
              key={type.id}
              to={`/learn/${type.id}/architecture`}
              className={() => (pathname.startsWith(`/learn/${type.id}/`) ? "is-active" : "")}
            >
              {type.short}
              {type.name.split(" (")[0] !== type.short && (
                <span className="topbar__full"> · {type.name.split(" (")[0]}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
