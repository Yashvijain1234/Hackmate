import { useSocket } from "../context/SocketContext";

export default function Toasts() {
    const { toasts } = useSocket();
    if (!toasts?.length) return null;
    return (
        <div className="toast-stack">
            {toasts.map((t) => (
                <div key={t.id} className="toast">
                    <div className="row center" style={{ gap: 10 }}>
                        <span style={{ fontSize: 18 }}>🔔</span>
                        <span style={{ fontSize: 14 }}>{t.message}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
