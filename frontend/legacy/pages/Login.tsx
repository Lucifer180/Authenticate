import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            setError("");

            await login(email, password);

            navigate("/dashboard")
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Login failed"
            );
        }
    }
    return (<>
        <h1>Login</h1>

        {error && <p>{error}</p>}

        <form onSubmit={handleSubmit}>
            <input type="email" placeholder="Email" onChange={event => setEmail(event.target.value)} />
            <input
                type="text"
                placeholder="Password"
                value={password}
                onChange={(event) =>
                    setPassword(event.target.value)
                }
            />

            <button type="submit">
                Login
            </button>
        </form>
    </>)
};

export default Login;