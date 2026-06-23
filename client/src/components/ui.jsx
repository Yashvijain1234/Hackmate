import { initials } from "../lib/helpers";

export function Spinner() {
    return <div className="spinner" />;
}

export function Avatar({ src, name, size = 40 }) {
    if (src) {
        return (
            <img
                className="avatar"
                src={src}
                alt={name}
                style={{ width: size, height: size }}
            />
        );
    }
    return (
        <div
            className="avatar"
            style={{
                width: size,
                height: size,
                display: "grid",
                placeItems: "center",
                fontSize: size * 0.4,
                fontWeight: 700,
                color: "#cfc8ff",
                background: "linear-gradient(135deg, #2a2750, #1a1d35)",
            }}
        >
            {initials(name || "?")}
        </div>
    );
}

export function Empty({ icon = "✦", title, subtitle, children }) {
    return (
        <div className="empty">
            <div className="big">{icon}</div>
            <h3 style={{ color: "var(--text-dim)" }}>{title}</h3>
            {subtitle && <p className="faint mt-1">{subtitle}</p>}
            {children && <div className="mt-2">{children}</div>}
        </div>
    );
}

export function Modal({ title, onClose, children, footer }) {
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="card modal" onClick={(e) => e.stopPropagation()}>
                <div className="row-between mb-2">
                    <h2>{title}</h2>
                    <button className="btn btn-sm btn-ghost" onClick={onClose}>
                        ✕
                    </button>
                </div>
                {children}
                {footer && <div className="row mt-2" style={{ justifyContent: "flex-end" }}>{footer}</div>}
            </div>
        </div>
    );
}

export function Chips({ items = [], variant }) {
    if (!items.length) return null;
    return (
        <div className="chips">
            {items.map((it, i) => (
                <span key={i} className={variant === "chip" ? "chip" : "badge"}>
                    {it}
                </span>
            ))}
        </div>
    );
}
