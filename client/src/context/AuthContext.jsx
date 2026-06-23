import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { tokenStore, getErr } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadMe = useCallback(async () => {
        if (!tokenStore.access) {
            setLoading(false);
            return;
        }
        try {
            const { data } = await api.get("/users/me");
            setUser(data.data);
        } catch {
            tokenStore.clear();
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMe();
        const onLogout = () => setUser(null);
        window.addEventListener("hm:logout", onLogout);
        return () => window.removeEventListener("hm:logout", onLogout);
    }, [loadMe]);

    const login = async (credentials) => {
        const { data } = await api.post("/users/login", credentials);
        tokenStore.set(data.data);
        setUser(data.data.user);
        return data.data.user;
    };

    const register = async (payload) => {
        // payload may be FormData (avatar) or plain object.
        await api.post("/users/register", payload);
        // Auto-login after registration.
        const email = payload instanceof FormData ? payload.get("email") : payload.email;
        const password =
            payload instanceof FormData ? payload.get("password") : payload.password;
        return login({ email, password });
    };

    const logout = async () => {
        try {
            await api.post("/users/logout");
        } catch {
            /* ignore */
        }
        tokenStore.clear();
        setUser(null);
    };

    const refreshUser = loadMe;
    const patchUser = (partial) => setUser((u) => ({ ...u, ...partial }));

    return (
        <AuthContext.Provider
            value={{ user, loading, login, register, logout, refreshUser, patchUser }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
export { getErr };
