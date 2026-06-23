import { useState, useRef, useEffect } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { Avatar } from "./ui";
import { timeAgo } from "../lib/helpers";

export default function Navbar() {
    const { user, logout } = useAuth();
    const { notifications, unread, markAllRead } = useSocket();
    const [openNotif, setOpenNotif] = useState(false);
    const [openMenu, setOpenMenu] = useState(false);
    const navigate = useNavigate();
    const ref = useRef();

    useEffect(() => {
        const close = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpenNotif(false);
                setOpenMenu(false);
            }
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    const doLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <nav className="navbar">
            <div className="container navbar-inner">
                <Link to="/" className="brand">
                    <span className="logo">H</span>
                    <span>
                        Hack<span className="gradient-text">Mate</span>
                    </span>
                </Link>

                <div className="nav-links">
                    <NavLink to="/hackathons" className="nav-link">
                        Hackathons
                    </NavLink>
                    <NavLink to="/teams" className="nav-link">
                        Teams
                    </NavLink>
                    {user && (
                        <NavLink to="/dashboard" className="nav-link">
                            Dashboard
                        </NavLink>
                    )}
                </div>

                <div className="nav-spacer" />

                {user ? (
                    <div className="row center" style={{ gap: 10 }} ref={ref}>
                        <div className="bell" style={{ position: "relative" }}>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => {
                                    setOpenNotif((v) => !v);
                                    setOpenMenu(false);
                                    if (!openNotif) markAllRead();
                                }}
                                style={{ fontSize: 18, padding: "7px 11px" }}
                            >
                                🔔
                                {unread > 0 && <span className="bell-dot">{unread}</span>}
                            </button>
                            {openNotif && (
                                <div className="dropdown">
                                    <div className="row-between" style={{ padding: "6px 10px 10px" }}>
                                        <strong>Notifications</strong>
                                        <span className="faint" style={{ fontSize: 12 }}>
                                            {notifications.length} total
                                        </span>
                                    </div>
                                    {notifications.length === 0 ? (
                                        <div className="faint text-c" style={{ padding: "26px 0" }}>
                                            No notifications yet
                                        </div>
                                    ) : (
                                        notifications.map((n) => (
                                            <div key={n.id} className="notif-item">
                                                <span className="dotmark" />
                                                <div>
                                                    <div style={{ fontSize: 13.5 }}>{n.message}</div>
                                                    <div className="faint" style={{ fontSize: 11.5, marginTop: 2 }}>
                                                        {timeAgo(n.at)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            className="row center"
                            onClick={() => {
                                setOpenMenu((v) => !v);
                                setOpenNotif(false);
                            }}
                            style={{ background: "none", border: "none", gap: 8 }}
                        >
                            <Avatar src={user.avatar} name={user.userName} size={34} />
                        </button>
                        {openMenu && (
                            <div className="dropdown" style={{ width: 200 }}>
                                <div style={{ padding: "8px 12px" }}>
                                    <div style={{ fontWeight: 700 }}>{user.userName}</div>
                                    <div className="faint" style={{ fontSize: 12 }}>
                                        {user.email}
                                    </div>
                                </div>
                                <div className="divider" style={{ margin: "6px 0" }} />
                                <Link to="/dashboard" className="notif-item" onClick={() => setOpenMenu(false)}>
                                    Dashboard
                                </Link>
                                <button
                                    className="notif-item"
                                    onClick={doLogout}
                                    style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "var(--danger)" }}
                                >
                                    Log out
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="row">
                        <Link to="/login" className="btn btn-ghost btn-sm">
                            Log in
                        </Link>
                        <Link to="/register" className="btn btn-primary btn-sm">
                            Sign up
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
}
