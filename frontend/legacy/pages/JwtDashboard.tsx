import { useState } from "react";
import { useJwtAuth } from "../context/JwtAuthContent";
import jwtApi from "../services/jwtApi";

const JwtDashboard = () => {
    const { user, logout } = useJwtAuth();

    const [profile, setProfile] = useState(null);
    const [error, setError] = useState("");

    const getProfile = async () => {
        try {
            setError("");

            const response = await jwtApi.get("/auth/jwtProfile");

            setProfile(response.data.user);
        } catch (error) {
            setError(
                error.response?.data?.message ||
                error.message ||
                "Request failed"
            );
        }
    };

    return (
        <div>
            <h2>JWT Dashboard</h2>

            <p>
                Welcome, {user?.name}
            </p>

            <button onClick={getProfile}>
                Get Protected Profile
            </button>

            <button onClick={logout}>
                Logout
            </button>

            {profile && (
                <pre>
                    {JSON.stringify(profile, null, 2)}
                </pre>
            )}

            {error && <p>{error}</p>}
        </div>
    );

}

export default JwtDashboard;