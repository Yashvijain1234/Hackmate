import { useEffect, useState, useCallback } from "react";
import api, { getErr } from "../api/client";
import { Spinner, Empty } from "../components/ui";
import TeamCard from "../components/TeamCard";

export default function Teams() {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [filters, setFilters] = useState({ q: "", skill: "", openOnly: true });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.q) params.q = filters.q;
            if (filters.skill) params.skill = filters.skill;
            if (filters.openOnly) params.isOpen = true;
            const { data } = await api.get("/teams", { params });
            setTeams(data.data.teams);
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
                <h1>Find a <span className="gradient-text">team</span></h1>
                <p className="subtitle mt-1 mb-3">Join teams that need your skills across all hackathons.</p>

                <div className="row wrap mb-3">
                    <input
                        className="input grow"
                        style={{ minWidth: 220 }}
                        placeholder="Search teams…"
                        value={filters.q}
                        onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                    />
                    <input
                        className="input"
                        style={{ width: 200 }}
                        placeholder="Skill needed (e.g. Figma)"
                        value={filters.skill}
                        onChange={(e) => setFilters({ ...filters, skill: e.target.value })}
                    />
                    <label className="btn btn-ghost row center" style={{ gap: 8 }}>
                        <input
                            type="checkbox"
                            checked={filters.openOnly}
                            onChange={(e) => setFilters({ ...filters, openOnly: e.target.checked })}
                        />
                        Open only
                    </label>
                </div>

                {err && <div className="alert alert-error">{err}</div>}

                {loading ? (
                    <Spinner />
                ) : teams.length === 0 ? (
                    <Empty icon="🤝" title="No teams found" subtitle="Try different filters or create one from a hackathon page." />
                ) : (
                    <div className="grid grid-cards">
                        {teams.map((t) => (
                            <TeamCard key={t._id} team={t} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
