import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { tokenStore } from "../api/client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

let idSeq = 0;

export function SocketProvider({ children }) {
    const { user } = useAuth();
    const socketRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [toasts, setToasts] = useState([]);

    const pushToast = useCallback((message) => {
        const id = ++idSeq;
        setToasts((t) => [...t, { id, message }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
    }, []);

    const addNotification = useCallback(
        (message) => {
            const id = ++idSeq;
            setNotifications((n) => [{ id, message, at: new Date(), read: false }, ...n].slice(0, 30));
            pushToast(message);
        },
        [pushToast]
    );

    useEffect(() => {
        if (!user || !tokenStore.access) {
            socketRef.current?.disconnect();
            socketRef.current = null;
            setConnected(false);
            return;
        }

        const socket = io("/", {
            auth: { token: tokenStore.access },
            transports: ["websocket", "polling"],
        });
        socketRef.current = socket;

        socket.on("connect", () => setConnected(true));
        socket.on("disconnect", () => setConnected(false));

        socket.on("joinRequest:received", (p) => addNotification(p.message));
        socket.on("joinRequest:invited", (p) => addNotification(p.message));
        socket.on("joinRequest:responded", (p) => addNotification(p.message));
        socket.on("team:member-removed", () => {});

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [user, addNotification]);

    const markAllRead = () =>
        setNotifications((n) => n.map((x) => ({ ...x, read: true })));
    const unread = notifications.filter((n) => !n.read).length;

    return (
        <SocketContext.Provider
            value={{
                socket: socketRef.current,
                connected,
                notifications,
                unread,
                markAllRead,
                toasts,
            }}
        >
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => useContext(SocketContext);
