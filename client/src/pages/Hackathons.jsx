import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api, { getErr } from "../api/client";
import { Spinner, Empty } from "../components/ui";
import { dateRange, statusBadgeClass } from "../lib/helpers";
import { useAuth } from "../context/AuthContext";

const MODES = ["", "Online", "Offline", "Hybrid"];
const STATUSES = ["", "Upcoming", "Ongoing", "Completed"];

function HackathonCard({ h }) {
    return (
        <Link to={`/hackathons/${h._id}`} className="card card-hover col">
            <div className="row-between">
                <span className={`badge ${statusBadgeClass(h.status)}`}>{h.status}</span>
                <span className="badge">{h.mode}</span>
            </div>
            <h3 style={{ marginTop: 6 }}>{h.name}</h3>
            <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, minHeight: 42 }}>
                {h.description?.slice(0, 110)}
                {h.description?.length > 110 ? "…" : ""}
            </p>
            <div className="chips">
                {(h.themes || []).slice(0, 3).map((t) => (
                    <span key={t} className="chip">
                        {t}
                    </span>
                ))}
            </div>
            <div className="divider" />
            <div className="row-between faint" style={{ fontSize: 13 }}>
                <span>📅 {dateRange(h.startDate, h.endDate)}</span>
                <span>👥 ≤ {h.maxTeamSize}</span>
            </div>
        </Link>
    );
}

export default function Hackathons() {
    const { user } = useAuth();
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [filters, setFilters] = useState({ q: "", mode: "", status: "" });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            Object.entries(filters).forEach(([k, v]) => v && (params[k] = v));
            const { data } = await api.get("/hackathons", { params });
            setList(data.data.hackathons);
        } catch (e) {
            setErr(getErr(e));
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        const t = setTimeout(load, 250);
        return () => clearTimeout(t);
    }, [load]);

    return (
        <div className="page">
            <div className="container">
                <div className="hero mb-3">
                    <h1>
                        Discover <span className="gradient-text">hackathons</span>
                    </h1>
                    <p className="subtitle mt-1" style={{ maxWidth: 520 }}>
                        Browse upcoming events, find a team that matches your skills, and start
                        building. Real-time updates keep you in the loop.
                    </p>
                    {user && (
                        <Link to="/hackathons/new" className="btn btn-primary mt-3">
                            + Add a hackathon
                        </Link>
                    )}
                </div>

                <div className="row wrap mb-3">
                    <input
                        className="input grow"
                        style={{ minWidth: 220 }}
                        placeholder="Search hackathons…"
                        value={filters.q}
                        onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                    />
                    <select
                        className="select"
                        style={{ width: 160 }}
                        value={filters.mode}
                        onChange={(e) => setFilters({ ...filters, mode: e.target.value })}
                    >
                        {MODES.map((m) => (
                            <option key={m} value={m}>
                                {m || "All modes"}
                            </option>
                        ))}
                    </select>
                    <select
                        className="select"
                        style={{ width: 160 }}
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    >
                        {STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {s || "All status"}
                            </option>
                        ))}
                    </select>
                </div>

                {err && <div className="alert alert-error">{err}</div>}

                {loading ? (
                    <Spinner />
                ) : list.length === 0 ? (
                    <Empty
                        icon="🔍"
                        title="No hackathons found"
                        subtitle="Try clearing filters, or seed data with `npm run seed:hackathons`."
                    />
                ) : (
                    <div className="grid grid-cards">
                        {list.map((h) => (
                            <HackathonCard key={h._id} h={h} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
