import { createBrowserRouter } from "react-router-dom";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoutes";
import Dashboard from "./pages/Dashboard";
import Register from "./pages/Register"
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPasword";
import JwtLogin from "./pages/JwtLogin";
import JwtDashboard from "./pages/JwtDashboard";
const Router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />
  },
  {
    path: "/jwt-login",
    element: <JwtLogin />
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />
  }, {
    path: "/reset-password/:token",
    element: <ResetPassword />
  },
  {
    path: "/jwt-dashboard",
    element: <JwtDashboard />
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/dashboard",
        element: <Dashboard />
      },

    ]
  }
]);

export default Router