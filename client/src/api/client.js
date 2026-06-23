import axios from "axios";

// Same-origin relative base; Vite proxies /api to the Express server in dev.
const api = axios.create({
    baseURL: "/api/v1",
});

export const tokenStore = {
    get access() {
        return localStorage.getItem("hm_access");
    },
    get refresh() {
        return localStorage.getItem("hm_refresh");
    },
    set({ accessToken, refreshToken }) {
        if (accessToken) localStorage.setItem("hm_access", accessToken);
        if (refreshToken) localStorage.setItem("hm_refresh", refreshToken);
    },
    clear() {
        localStorage.removeItem("hm_access");
        localStorage.removeItem("hm_refresh");
    },
};

api.interceptors.request.use((config) => {
    const token = tokenStore.access;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Transparent refresh-token retry on 401.
let refreshing = null;
api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config;
        const status = error.response?.status;

        if (
            status === 401 &&
            !original._retry &&
            tokenStore.refresh &&
            !original.url?.includes("/refresh-token") &&
            !original.url?.includes("/login")
        ) {
            original._retry = true;
            try {
                refreshing =
                    refreshing ||
                    api.post("/users/refresh-token", {
                        refreshToken: tokenStore.refresh,
                    });
                const { data } = await refreshing;
                refreshing = null;
                tokenStore.set(data.data);
                original.headers.Authorization = `Bearer ${data.data.accessToken}`;
                return api(original);
            } catch (e) {
                refreshing = null;
                tokenStore.clear();
                window.dispatchEvent(new Event("hm:logout"));
            }
        }
        return Promise.reject(error);
    }
);

export const getErr = (error) =>
    error?.response?.data?.message || error?.message || "Something went wrong";

export default api;
