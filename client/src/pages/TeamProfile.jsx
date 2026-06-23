import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api, { getErr } from "../api/client";
import { Spinner, Avatar, Modal, Empty } from "../components/ui";
import { statusBadgeClass, timeAgo } from "../lib/helpers";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

export default function TeamProfile() {
    const { id } = useParams();
    const { user } = useAuth();
    const { socket } = useSocket();
    const navigate = useNavigate();

    const [team, setTeam] = useState(null);
    const [incoming, setIncoming] = useState([]);
    const [myRequest, setMyRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);
    const [showJoin, setShowJoin] = useState(false);
    const [showInvite, setShowInvite] = useState(false);

    const isLeader = user && team && team.leader?._id === user._id;
    const isMember = user && team && team.members?.some((m) => m.user?._id === user._id);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/teams/${id}`);
            setTeam(data.data);
            if (user) {
                const [inc, sent] = await Promise.all([
                    api.get("/join-requests/incoming"),
                    api.get("/join-requests/sent"),
                ]);
                setIncoming(inc.data.data.filter((r) => r.team?._id === id && r.status === "pending"));
                setMyRequest(
                    sent.data.data.find((r) => r.team?._id === id && r.status === "pending") || null
                );
            }
        } catch (e) {
            setErr(getErr(e));
        } finally {
            setLoading(false);
        }
    }, [id, user]);

    useEffect(() => {
        load();
    }, [load]);

    // Refresh on relevant realtime events.
    useEffect(() => {
        if (!socket) return;
        const refresh = () => load();
        socket.on("joinRequest:received", refresh);
        socket.on("joinRequest:responded", refresh);
        socket.on("team:updated", refresh);
        return () => {
            socket.off("joinRequest:received", refresh);
            socket.off("joinRequest:responded", refresh);
            socket.off("team:updated", refresh);
        };
    }, [socket, load]);

    const respond = async (reqId, action) => {
        setBusy(true);
        try {
            await api.patch(`/join-requests/${reqId}/respond`, { action });
            await load();
        } catch (e) {
            alert(getErr(e));
        } finally {
            setBusy(false);
        }
    };

    const removeMember = async (userId) => {
        if (!confirm("Remove this member?")) return;
        try {
            await api.delete(`/teams/${id}/members/${userId}`);
            load();
        } catch (e) {
            alert(getErr(e));
        }
    };

    const leave = async () => {
        if (!confirm("Leave this team?")) return;
        try {
            await api.post(`/teams/${id}/leave`);
            navigate("/dashboard");
        } catch (e) {
            alert(getErr(e));
        }
    };

    const remove = async () => {
        if (!confirm("Delete this team permanently?")) return;
        try {
            await api.delete(`/teams/${id}`);
            navigate("/dashboard");
        } catch (e) {
            alert(getErr(e));
        }
    };

    const toggleOpen = async () => {
        try {
            await api.patch(`/teams/${id}`, { isOpen: !team.isOpen });
            load();
        } catch (e) {
            alert(getErr(e));
        }
    };

    const cancelMyRequest = async () => {
        try {
            await api.patch(`/join-requests/${myRequest._id}/cancel`);
            load();
        } catch (e) {
            alert(getErr(e));
        }
    };

    if (loading) return <Spinner />;
    if (err) return <div className="page"><div className="container"><div className="alert alert-error">{err}</div></div></div>;
    if (!team) return null;

    const full = team.members.length >= team.maxSize;

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: 900 }}>
                {team.hackathon && (
                    <Link to={`/hackathons/${team.hackathon._id}`} className="muted" style={{ fontSize: 14 }}>
                        ← {team.hackathon.name}
                    </Link>
                )}

                <div className="hero mt-2 mb-3">
                    <div className="row-between wrap">
                        <div>
                            <div className="row center" style={{ gap: 10 }}>
                                <h1>{team.name}</h1>
                                {team.isOpen && !full ? (
                                    <span className="badge badge-success">Open</span>
                                ) : (
                                    <span className="badge">Full</span>
                                )}
                            </div>
                            <p className="subtitle mt-1" style={{ maxWidth: 560 }}>
                                {team.description || "No pitch yet."}
                            </p>
                        </div>
                        <div className="col" style={{ gap: 8 }}>
                            {!user && (
                                <Link to="/login" className="btn btn-primary">Log in to join</Link>
                            )}
                            {user && !isMember && !myRequest && team.isOpen && !full && (
                                <button className="btn btn-primary" onClick={() => setShowJoin(true)}>
                                    Request to join
                                </button>
                            )}
                            {user && !isMember && myRequest && (
                                <button className="btn btn-ghost" onClick={cancelMyRequest}>
                                    Cancel request
                                </button>
                            )}
                            {isMember && !isLeader && (
                                <button className="btn btn-danger" onClick={leave}>Leave team</button>
                            )}
                            {isLeader && (
                                <>
                                    <button className="btn btn-ghost" onClick={() => setShowInvite(true)}>+ Invite member</button>
                                    <button className="btn btn-ghost" onClick={toggleOpen}>
                                        {team.isOpen ? "Close team" : "Reopen team"}
                                    </button>
                                    <button className="btn btn-danger" onClick={remove}>Delete team</button>
                                </>
                            )}
                        </div>
                    </div>

                    {(team.requiredRoles?.length > 0 || team.requiredSkills?.length > 0) && (
                        <div className="row wrap mt-3" style={{ gap: 26 }}>
                            {team.requiredRoles?.length > 0 && (
                                <div>
                                    <div className="faint" style={{ fontSize: 12, marginBottom: 6 }}>Roles needed</div>
                                    <div className="chips">
                                        {team.requiredRoles.map((r) => (
                                            <span key={r} className="badge badge-primary">{r}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {team.requiredSkills?.length > 0 && (
                                <div>
                                    <div className="faint" style={{ fontSize: 12, marginBottom: 6 }}>Skills needed</div>
                                    <div className="chips">
                                        {team.requiredSkills.map((s) => (
                                            <span key={s} className="chip">{s}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid" style={{ gridTemplateColumns: isLeader ? "1.3fr 1fr" : "1fr", alignItems: "start" }}>
                    <div className="card">
                        <h2 className="mb-2">Members ({team.members.length}/{team.maxSize})</h2>
                        {team.members.map((m) => (
                            <div key={m.user?._id} className="member-row">
                                <Avatar src={m.user?.avatar} name={m.user?.userName} size={42} />
                                <div className="grow">
                                    <Link to={`/users/${m.user?._id}`} style={{ fontWeight: 650 }}>
                                        {m.user?.userName}
                                    </Link>
                                    <div className="faint" style={{ fontSize: 12.5 }}>
                                        {(m.user?.skills || []).slice(0, 3).join(" · ") || "—"}
                                    </div>
                                </div>
                                <span className={`badge ${m.role === "Leader" ? "badge-primary" : ""}`}>{m.role}</span>
                                {isLeader && m.role !== "Leader" && (
                                    <button className="btn btn-sm btn-danger" onClick={() => removeMember(m.user?._id)}>
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {isLeader && (
                        <div className="card">
                            <h2 className="mb-2">Join requests</h2>
                            {incoming.length === 0 ? (
                                <Empty icon="📭" title="No pending requests" />
                            ) : (
                                incoming.map((r) => (
                                    <div key={r._id} className="member-row" style={{ alignItems: "flex-start" }}>
                                        <Avatar src={r.user?.avatar} name={r.user?.userName} size={38} />
                                        <div className="grow">
                                            <Link to={`/users/${r.user?._id}`} style={{ fontWeight: 650 }}>
                                                {r.user?.userName}
                                            </Link>
                                            {r.message && (
                                                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>“{r.message}”</div>
                                            )}
                                            <div className="faint" style={{ fontSize: 11.5, marginTop: 2 }}>{timeAgo(r.createdAt)}</div>
                                            <div className="row mt-1">
                                                <button className="btn btn-sm btn-success" disabled={busy} onClick={() => respond(r._id, "accept")}>
                                                    Accept
                                                </button>
                                                <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => respond(r._id, "reject")}>
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showJoin && (
                <JoinModal teamId={id} onClose={() => setShowJoin(false)} onDone={() => { setShowJoin(false); load(); }} />
            )}
            {showInvite && (
                <InviteModal teamId={id} onClose={() => setShowInvite(false)} onDone={() => { setShowInvite(false); load(); }} />
            )}
        </div>
    );
}

function JoinModal({ teamId, onClose, onDone }) {
    const [message, setMessage] = useState("");
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        setErr("");
        setLoading(true);
        try {
            await api.post("/join-requests/request", { teamId, message });
            onDone();
        } catch (e) {
            setErr(getErr(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Request to join"
            onClose={onClose}
            footer={
                <>
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" disabled={loading} onClick={submit}>
                        {loading ? "Sending…" : "Send request"}
                    </button>
                </>
            }
        >
            {err && <div className="alert alert-error">{err}</div>}
            <div className="field">
                <label className="label">Message to the team leader</label>
                <textarea
                    className="textarea"
                    placeholder="Hi! I'm a React + Node dev, free this weekend…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={300}
                />
            </div>
        </Modal>
    );
}

function InviteModal({ teamId, onClose, onDone }) {
    const [q, setQ] = useState("");
    const [results, setResults] = useState([]);
    const [msg, setMsg] = useState("");

    useEffect(() => {
        const t = setTimeout(async () => {
            if (!q.trim()) return setResults([]);
            try {
                const { data } = await api.get("/users/search", { params: { q } });
                setResults(data.data.users);
            } catch {
                /* ignore */
            }
        }, 300);
        return () => clearTimeout(t);
    }, [q]);

    const invite = async (userId) => {
        try {
            await api.post("/join-requests/invite", { teamId, userId, message: msg });
            onDone();
        } catch (e) {
            alert(getErr(e));
        }
    };

    return (
        <Modal title="Invite a member" onClose={onClose}>
            <div className="field">
                <label className="label">Search users</label>
                <input className="input" placeholder="Username or bio…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="field">
                <label className="label">Message (optional)</label>
                <input className="input" value={msg} onChange={(e) => setMsg(e.target.value)} />
            </div>
            <div style={{ maxHeight: 260, overflowY: "auto" }}>
                {results.map((u) => (
                    <div key={u._id} className="member-row">
                        <Avatar src={u.avatar} name={u.userName} size={36} />
                        <div className="grow">
                            <div style={{ fontWeight: 650 }}>{u.userName}</div>
                            <div className="faint" style={{ fontSize: 12 }}>{(u.skills || []).slice(0, 3).join(" · ")}</div>
                        </div>
                        <button className="btn btn-sm btn-primary" onClick={() => invite(u._id)}>Invite</button>
                    </div>
                ))}
                {q && results.length === 0 && <p className="faint text-c mt-2">No users found.</p>}
            </div>
        </Modal>
    );
}
