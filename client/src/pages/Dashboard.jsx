import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api, { getErr } from "../api/client";
import { Spinner, Avatar, Empty, Modal } from "../components/ui";
import { statusBadgeClass, timeAgo } from "../lib/helpers";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import TeamCard from "../components/TeamCard";

export default function Dashboard() {
    const { user, patchUser } = useAuth();
    const { socket } = useSocket();
    const [tab, setTab] = useState("teams");
    const [teams, setTeams] = useState([]);
    const [incoming, setIncoming] = useState([]);
    const [sent, setSent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEdit, setShowEdit] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [t, inc, s] = await Promise.all([
                api.get("/teams/mine"),
                api.get("/join-requests/incoming"),
                api.get("/join-requests/sent"),
            ]);
            setTeams(t.data.data);
            setIncoming(inc.data.data);
            setSent(s.data.data);
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!socket) return;
        const refresh = () => load();
        ["joinRequest:received", "joinRequest:responded", "joinRequest:invited"].forEach((e) =>
            socket.on(e, refresh)
        );
        return () =>
            ["joinRequest:received", "joinRequest:responded", "joinRequest:invited"].forEach((e) =>
                socket.off(e, refresh)
            );
    }, [socket, load]);

    const respond = async (id, action) => {
        try {
            await api.patch(`/join-requests/${id}/respond`, { action });
            load();
        } catch (e) {
            alert(getErr(e));
        }
    };
    const cancel = async (id) => {
        try {
            await api.patch(`/join-requests/${id}/cancel`);
            load();
        } catch (e) {
            alert(getErr(e));
        }
    };

    const pendingIncoming = incoming.filter((r) => r.status === "pending");

    if (!user) return null;

    return (
        <div className="page">
            <div className="container">
                {/* Profile header */}
                <div className="card mb-3">
                    <div className="row wrap center" style={{ gap: 18 }}>
                        <Avatar src={user.avatar} name={user.userName} size={84} />
                        <div className="grow">
                            <h1>{user.userName}</h1>
                            <p className="subtitle">{user.bio || "No bio yet."}</p>
                            <div className="row wrap mt-2" style={{ gap: 8 }}>
                                <span className="badge badge-primary">{user.experienceLevel}</span>
                                {(user.preferredRoles || []).map((r) => (
                                    <span key={r} className="badge">{r}</span>
                                ))}
                                {user.collegeOrOrg && <span className="badge">🎓 {user.collegeOrOrg}</span>}
                            </div>
                            {user.skills?.length > 0 && (
                                <div className="chips mt-2">
                                    {user.skills.map((s) => (
                                        <span key={s} className="chip">{s}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button className="btn btn-ghost" onClick={() => setShowEdit(true)}>Edit profile</button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid mb-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
                    <div className="stat"><div className="num">{teams.length}</div><div className="lbl">Teams</div></div>
                    <div className="stat"><div className="num">{pendingIncoming.length}</div><div className="lbl">Pending for you</div></div>
                    <div className="stat"><div className="num">{sent.filter((r) => r.status === "pending").length}</div><div className="lbl">Awaiting reply</div></div>
                    <div className="stat"><div className="num">{sent.filter((r) => r.status === "accepted").length}</div><div className="lbl">Accepted</div></div>
                </div>

                <div className="tabs">
                    <button className={`tab ${tab === "teams" ? "active" : ""}`} onClick={() => setTab("teams")}>My Teams</button>
                    <button className={`tab ${tab === "incoming" ? "active" : ""}`} onClick={() => setTab("incoming")}>
                        Incoming {pendingIncoming.length > 0 && <span className="badge badge-danger" style={{ marginLeft: 6 }}>{pendingIncoming.length}</span>}
                    </button>
                    <button className={`tab ${tab === "sent" ? "active" : ""}`} onClick={() => setTab("sent")}>Sent</button>
                </div>

                {loading ? (
                    <Spinner />
                ) : tab === "teams" ? (
                    teams.length === 0 ? (
                        <Empty icon="🚀" title="You're not on any team yet" subtitle="Browse hackathons and create or join a team.">
                            <Link to="/hackathons" className="btn btn-primary">Browse hackathons</Link>
                        </Empty>
                    ) : (
                        <div className="grid grid-cards">
                            {teams.map((t) => (
                                <TeamCard key={t._id} team={t} />
                            ))}
                        </div>
                    )
                ) : tab === "incoming" ? (
                    incoming.length === 0 ? (
                        <Empty icon="📭" title="Nothing incoming" subtitle="Requests to your teams and invites to you show up here." />
                    ) : (
                        <div className="col">
                            {incoming.map((r) => (
                                <RequestRow key={r._id} r={r} kind="incoming" onRespond={respond} />
                            ))}
                        </div>
                    )
                ) : sent.length === 0 ? (
                    <Empty icon="✉️" title="No sent requests" />
                ) : (
                    <div className="col">
                        {sent.map((r) => (
                            <RequestRow key={r._id} r={r} kind="sent" onCancel={cancel} />
                        ))}
                    </div>
                )}
            </div>

            {showEdit && (
                <EditProfileModal
                    user={user}
                    onClose={() => setShowEdit(false)}
                    onSaved={(u) => {
                        patchUser(u);
                        setShowEdit(false);
                    }}
                />
            )}
        </div>
    );
}

function RequestRow({ r, kind, onRespond, onCancel }) {
    const who = r.user;
    const isInvite = r.initiatedBy === "team";
    const label =
        kind === "incoming"
            ? isInvite
                ? `Invite to join "${r.team?.name}"`
                : `${who?.userName} wants to join "${r.team?.name}"`
            : isInvite
              ? `You invited ${who?.userName} to "${r.team?.name}"`
              : `Your request to "${r.team?.name}"`;

    const canAct = kind === "incoming" && r.status === "pending";
    const canCancel = kind === "sent" && r.status === "pending";

    return (
        <div className="card row-between center wrap" style={{ gap: 12 }}>
            <div className="row center" style={{ gap: 12 }}>
                <Avatar src={who?.avatar} name={who?.userName} size={40} />
                <div>
                    <div style={{ fontWeight: 600 }}>{label}</div>
                    {r.message && <div className="muted" style={{ fontSize: 13 }}>“{r.message}”</div>}
                    <div className="faint" style={{ fontSize: 12 }}>{timeAgo(r.createdAt)}</div>
                </div>
            </div>
            <div className="row center">
                <span className={`badge ${statusBadgeClass(r.status)}`}>{r.status}</span>
                {canAct && (
                    <>
                        <button className="btn btn-sm btn-success" onClick={() => onRespond(r._id, "accept")}>Accept</button>
                        <button className="btn btn-sm btn-danger" onClick={() => onRespond(r._id, "reject")}>Reject</button>
                    </>
                )}
                {canCancel && (
                    <button className="btn btn-sm btn-ghost" onClick={() => onCancel(r._id)}>Cancel</button>
                )}
                {r.team?._id && (
                    <Link to={`/teams/${r.team._id}`} className="btn btn-sm btn-ghost">View</Link>
                )}
            </div>
        </div>
    );
}

function EditProfileModal({ user, onClose, onSaved }) {
    const [form, setForm] = useState({
        bio: user.bio || "",
        skills: (user.skills || []).join(", "),
        experienceLevel: user.experienceLevel || "Beginner",
        githubUrl: user.githubUrl || "",
        linkedinUrl: user.linkedinUrl || "",
        portfolioUrl: user.portfolioUrl || "",
        collegeOrOrg: user.collegeOrOrg || "",
    });
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);
    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const save = async () => {
        setErr("");
        setLoading(true);
        try {
            const { data } = await api.patch("/users/profile", form);
            onSaved(data.data);
        } catch (e) {
            setErr(getErr(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Edit profile"
            onClose={onClose}
            footer={
                <>
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" disabled={loading} onClick={save}>
                        {loading ? "Saving…" : "Save"}
                    </button>
                </>
            }
        >
            {err && <div className="alert alert-error">{err}</div>}
            <div className="field">
                <label className="label">Bio</label>
                <textarea className="textarea" value={form.bio} onChange={set("bio")} maxLength={300} />
            </div>
            <div className="field">
                <label className="label">Skills (comma separated)</label>
                <input className="input" value={form.skills} onChange={set("skills")} />
            </div>
            <div className="field">
                <label className="label">Experience</label>
                <select className="select" value={form.experienceLevel} onChange={set("experienceLevel")}>
                    {["Beginner", "Intermediate", "Advanced"].map((l) => (
                        <option key={l}>{l}</option>
                    ))}
                </select>
            </div>
            <div className="row wrap">
                <div className="field grow" style={{ minWidth: 200 }}>
                    <label className="label">GitHub URL</label>
                    <input className="input" value={form.githubUrl} onChange={set("githubUrl")} />
                </div>
                <div className="field grow" style={{ minWidth: 200 }}>
                    <label className="label">LinkedIn URL</label>
                    <input className="input" value={form.linkedinUrl} onChange={set("linkedinUrl")} />
                </div>
            </div>
            <div className="row wrap">
                <div className="field grow" style={{ minWidth: 200 }}>
                    <label className="label">Portfolio URL</label>
                    <input className="input" value={form.portfolioUrl} onChange={set("portfolioUrl")} />
                </div>
                <div className="field grow" style={{ minWidth: 200 }}>
                    <label className="label">College / Org</label>
                    <input className="input" value={form.collegeOrOrg} onChange={set("collegeOrOrg")} />
                </div>
            </div>
        </Modal>
    );
}
