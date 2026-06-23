import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api, { getErr } from "../api/client";
import { Spinner, Empty, Modal, Avatar } from "../components/ui";
import { dateRange, statusBadgeClass } from "../lib/helpers";
import { useAuth } from "../context/AuthContext";
import TeamCard from "../components/TeamCard";

export default function HackathonDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const [hack, setHack] = useState(null);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [showCreate, setShowCreate] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [h, t] = await Promise.all([
                api.get(`/hackathons/${id}`),
                api.get("/teams", { params: { hackathon: id } }),
            ]);
            setHack(h.data.data);
            setTeams(t.data.data.teams);
        } catch (e) {
            setErr(getErr(e));
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    if (loading) return <Spinner />;
    if (err) return <div className="page"><div className="container"><div className="alert alert-error">{err}</div></div></div>;
    if (!hack) return null;

    return (
        <div className="page">
            <div className="container">
                <Link to="/hackathons" className="muted" style={{ fontSize: 14 }}>
                    ← Back to hackathons
                </Link>

                <div className="hero mt-2 mb-3">
                    <div className="row-between wrap">
                        <div style={{ maxWidth: 640 }}>
                            <div className="row" style={{ gap: 8 }}>
                                <span className={`badge ${statusBadgeClass(hack.status)}`}>{hack.status}</span>
                                <span className="badge">{hack.mode}</span>
                            </div>
                            <h1 className="mt-2">{hack.name}</h1>
                            <p className="subtitle mt-1">{hack.description}</p>
                            <div className="chips mt-2">
                                {(hack.themes || []).map((t) => (
                                    <span key={t} className="chip">{t}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="row wrap mt-3" style={{ gap: 22, fontSize: 14 }}>
                        <span className="muted">📅 {dateRange(hack.startDate, hack.endDate)}</span>
                        {hack.location && <span className="muted">📍 {hack.location}</span>}
                        {hack.organizer && <span className="muted">🏢 {hack.organizer}</span>}
                        <span className="muted">👥 Teams of {hack.minTeamSize}–{hack.maxTeamSize}</span>
                        {hack.externalLink && (
                            <a className="gradient-text" href={hack.externalLink} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>
                                Official page ↗
                            </a>
                        )}
                    </div>
                </div>

                <div className="row-between mb-2">
                    <h2>Teams looking for members ({teams.length})</h2>
                    {user ? (
                        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                            + Create a team
                        </button>
                    ) : (
                        <Link to="/login" className="btn btn-ghost">Log in to create a team</Link>
                    )}
                </div>

                {teams.length === 0 ? (
                    <Empty icon="🤝" title="No teams yet" subtitle="Be the first to start a team for this hackathon." />
                ) : (
                    <div className="grid grid-cards">
                        {teams.map((t) => (
                            <TeamCard key={t._id} team={t} />
                        ))}
                    </div>
                )}
            </div>

            {showCreate && (
                <CreateTeamModal
                    hackathon={hack}
                    onClose={() => setShowCreate(false)}
                    onCreated={() => {
                        setShowCreate(false);
                        load();
                    }}
                />
            )}
        </div>
    );
}

function CreateTeamModal({ hackathon, onClose, onCreated }) {
    const [form, setForm] = useState({
        name: "",
        description: "",
        maxSize: hackathon.maxTeamSize || 4,
        requiredRoles: "",
        requiredSkills: "",
    });
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);
    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        setErr("");
        setLoading(true);
        try {
            await api.post("/teams", { ...form, hackathon: hackathon._id });
            onCreated();
        } catch (e) {
            setErr(getErr(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal title="Create a team" onClose={onClose}>
            {err && <div className="alert alert-error">{err}</div>}
            <form onSubmit={submit}>
                <div className="field">
                    <label className="label">Team name *</label>
                    <input className="input" value={form.name} onChange={set("name")} required />
                </div>
                <div className="field">
                    <label className="label">Pitch / idea</label>
                    <textarea className="textarea" value={form.description} onChange={set("description")} maxLength={500} />
                </div>
                <div className="field">
                    <label className="label">Roles needed (comma separated)</label>
                    <input className="input" placeholder="Backend Dev, Designer" value={form.requiredRoles} onChange={set("requiredRoles")} />
                </div>
                <div className="field">
                    <label className="label">Skills needed (comma separated)</label>
                    <input className="input" placeholder="Figma, Node.js" value={form.requiredSkills} onChange={set("requiredSkills")} />
                </div>
                <div className="field">
                    <label className="label">Max size</label>
                    <input className="input" type="number" min={1} max={hackathon.maxTeamSize || 10} value={form.maxSize} onChange={set("maxSize")} />
                </div>
                <button className="btn btn-primary btn-block" disabled={loading}>
                    {loading ? "Creating…" : "Create team"}
                </button>
            </form>
        </Modal>
    );
}
