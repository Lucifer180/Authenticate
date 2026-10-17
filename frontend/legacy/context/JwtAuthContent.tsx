import { createContext, useContext, useState } from "react";

import api from "../services/api";
import jwtApi from "../services/jwtApi";
import {
    setAccessToken,
    clearAccessToken,
} from "../services/tokenManager";
const JwtAuthContext = createContext(null);

export const JwtAuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    const login = async (email, password) => {
        const response = await api.post("/auth/jwt/login", {
            email, password
        });

        setAccessToken(response.data.accessToken);
        setUser(response.data.user);

        return response.data;
    }

    const logout = async () => {
        try {
            await jwtApi.post("/auth/jwt/logout");
        } finally {
            clearAccessToken();
            setUser(null);
        }
    };
    // const authRequest = async (config) => {
    //     if (!accessToken) {
    //         throw new Error("No access token");
    //     }
    //     return jwtApi({
    //         ...config,
    //         headers: {
    //             ...config.headers,
    //             Authorization: `Bearer ${accessToken}`
    //         }
    //     })
    // }
    const value = {
        user, login, logout
    }

    return (
        <JwtAuthContext.Provider value={value}>
            {children}
        </JwtAuthContext.Provider>
    )
};

export const useJwtAuth = () => {
    return useContext(JwtAuthContext);
}

