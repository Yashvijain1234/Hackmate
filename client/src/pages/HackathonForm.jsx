import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { getErr } from "../api/client";

const MODES = ["Online", "Offline", "Hybrid"];

export default function HackathonForm() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: "",
        description: "",
        organizer: "",
        mode: "Online",
        location: "",
        startDate: "",
        endDate: "",
        registrationDeadline: "",
        themes: "",
        minTeamSize: 1,
        maxTeamSize: 4,
        externalLink: "",
    });
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);
    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        setErr("");
        setLoading(true);
        try {
            const { data } = await api.post("/hackathons", form);
            navigate(`/hackathons/${data.data._id}`);
        } catch (e) {
            setErr(getErr(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: 720 }}>
                <h1 className="mb-1">Add a hackathon</h1>
                <p className="subtitle mb-3">Share an event so others can form teams around it.</p>

                {err && <div className="alert alert-error">{err}</div>}

                <form className="card" onSubmit={submit}>
                    <div className="field">
                        <label className="label">Name *</label>
                        <input className="input" value={form.name} onChange={set("name")} required />
                    </div>
                    <div className="field">
                        <label className="label">Description *</label>
                        <textarea className="textarea" value={form.description} onChange={set("description")} maxLength={1000} required />
                    </div>
                    <div className="row wrap">
                        <div className="field grow" style={{ minWidth: 200 }}>
                            <label className="label">Organizer</label>
                            <input className="input" value={form.organizer} onChange={set("organizer")} />
                        </div>
                        <div className="field grow" style={{ minWidth: 160 }}>
                            <label className="label">Mode</label>
                            <select className="select" value={form.mode} onChange={set("mode")}>
                                {MODES.map((m) => (
                                    <option key={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="field">
                        <label className="label">Location</label>
                        <input className="input" value={form.location} onChange={set("location")} placeholder="Online / City" />
                    </div>
                    <div className="row wrap">
                        <div className="field grow" style={{ minWidth: 160 }}>
                            <label className="label">Start date *</label>
                            <input className="input" type="date" value={form.startDate} onChange={set("startDate")} required />
                        </div>
                        <div className="field grow" style={{ minWidth: 160 }}>
                            <label className="label">End date *</label>
                            <input className="input" type="date" value={form.endDate} onChange={set("endDate")} required />
                        </div>
                        <div className="field grow" style={{ minWidth: 160 }}>
                            <label className="label">Reg. deadline</label>
                            <input className="input" type="date" value={form.registrationDeadline} onChange={set("registrationDeadline")} />
                        </div>
                    </div>
                    <div className="field">
                        <label className="label">Themes (comma separated)</label>
                        <input className="input" placeholder="AI/ML, FinTech, Web3" value={form.themes} onChange={set("themes")} />
                    </div>
                    <div className="row wrap">
                        <div className="field grow" style={{ minWidth: 140 }}>
                            <label className="label">Min team size</label>
                            <input className="input" type="number" min={1} value={form.minTeamSize} onChange={set("minTeamSize")} />
                        </div>
                        <div className="field grow" style={{ minWidth: 140 }}>
                            <label className="label">Max team size</label>
                            <input className="input" type="number" min={1} value={form.maxTeamSize} onChange={set("maxTeamSize")} />
                        </div>
                        <div className="field grow" style={{ minWidth: 200 }}>
                            <label className="label">External link</label>
                            <input className="input" value={form.externalLink} onChange={set("externalLink")} placeholder="https://devpost.com/…" />
                        </div>
                    </div>
                    <button className="btn btn-primary btn-block mt-1" disabled={loading}>
                        {loading ? "Creating…" : "Create hackathon"}
                    </button>
                </form>
            </div>
        </div>
    );
}
