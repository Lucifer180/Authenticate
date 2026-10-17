import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const protectedRoute = () => {
    const { user, loading } = useAuth();

    if (loading) return <p>loading</p>;

    if (!user) return <Navigate to="/login" replace />;

    return <Outlet />
};

export default protectedRoute;