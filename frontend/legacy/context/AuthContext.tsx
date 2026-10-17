import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchCurrentUser = async () => {
        try {
            const res = await api.get("/auth/me");
            setUser(res.data.user)
        } catch (error) {
            setUser(null);
        }
        finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    const login = async (email, password) => {
        const response = await api.post("/auth/login", {
            email, password
        });

        setUser(response.data.user);

        return response.data;
    };

    const logout = async () => {
        await api.post("/auth/logout");

        setUser(null);
    };

    const register = async(name,email,password)=>{

        await api.post("/auth/register",{name,email,password});
    }

    const value = {
        user, loading, login, logout, fetchCurrentUser,register
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    )

};

export const useAuth = ()=>{
    return useContext(AuthContext)
}