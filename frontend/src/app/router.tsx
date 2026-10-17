import { createBrowserRouter, Navigate } from "react-router-dom";
import AuthTypePage from "../pages/AuthTypePage";
import HomePage from "../pages/HomePage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import Layout from "./Layout";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/learn/:typeId", element: <AuthTypePage /> },
      { path: "/learn/:typeId/:section", element: <AuthTypePage /> },
      // The password-reset email links here (FRONTEND_URL/reset-password/:token).
      { path: "/reset-password/:token", element: <ResetPasswordPage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
], { basename: "/Authenticate" });

export default router;
