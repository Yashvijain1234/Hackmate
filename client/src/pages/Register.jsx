import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, getErr } from "../context/AuthContext";

const ROLES = ["Frontend", "Backend", "Full Stack", "ML/AI", "UI/UX Designer", "Mobile", "DevOps", "Other"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        userName: "",
        email: "",
        password: "",
        bio: "",
        skills: "",
        experienceLevel: "Beginner",
        collegeOrOrg: "",
    });
    const [roles, setRoles] = useState([]);
    const [avatar, setAvatar] = useState(null);
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
    const toggleRole = (r) =>
        setRoles((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]));

    const submit = async (e) => {
        e.preventDefault();
        setErr("");
        setLoading(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
            roles.forEach((r) => fd.append("preferredRoles", r));
            if (avatar) fd.append("avatar", avatar);
            await register(fd);
            navigate("/dashboard");
        } catch (e) {
            setErr(getErr(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrap">
            <div className="card auth-card" style={{ maxWidth: 540 }}>
                <h1 className="mb-1">Create your account</h1>
                <p className="subtitle mb-3">Build a profile so teams can find you.</p>

                {err && <div className="alert alert-error">{err}</div>}

                <form onSubmit={submit}>
                    <div className="row wrap">
                        <div className="field grow" style={{ minWidth: 200 }}>
                            <label className="label">Username</label>
                            <input className="input" value={form.userName} onChange={set("userName")} required />
                        </div>
                        <div className="field grow" style={{ minWidth: 200 }}>
                            <label className="label">Email</label>
                            <input className="input" type="email" value={form.email} onChange={set("email")} required />
                        </div>
                    </div>

                    <div className="field">
                        <label className="label">Password</label>
                        <input className="input" type="password" value={form.password} onChange={set("password")} required minLength={6} />
                    </div>

                    <div className="field">
                        <label className="label">Bio</label>
                        <textarea className="textarea" placeholder="A short intro about you…" value={form.bio} onChange={set("bio")} maxLength={300} />
                    </div>

                    <div className="field">
                        <label className="label">Skills (comma separated)</label>
                        <input className="input" placeholder="React, Node.js, Figma" value={form.skills} onChange={set("skills")} />
                    </div>

                    <div className="field">
                        <label className="label">Preferred roles</label>
                        <div className="chips">
                            {ROLES.map((r) => (
                                <button
                                    type="button"
                                    key={r}
                                    className={roles.includes(r) ? "chip" : "chip"}
                                    onClick={() => toggleRole(r)}
                                    style={
                                        roles.includes(r)
                                            ? { background: "rgba(108,92,231,0.2)", borderColor: "var(--primary)", color: "#fff" }
                                            : {}
                                    }
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="row wrap">
                        <div className="field grow" style={{ minWidth: 180 }}>
                            <label className="label">Experience</label>
                            <select className="select" value={form.experienceLevel} onChange={set("experienceLevel")}>
                                {LEVELS.map((l) => (
                                    <option key={l}>{l}</option>
                                ))}
                            </select>
                        </div>
                        <div className="field grow" style={{ minWidth: 180 }}>
                            <label className="label">College / Org</label>
                            <input className="input" value={form.collegeOrOrg} onChange={set("collegeOrOrg")} />
                        </div>
                    </div>

                    <div className="field">
                        <label className="label">Avatar (optional)</label>
                        <input className="input" type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files[0])} />
                    </div>

                    <button className="btn btn-primary btn-block mt-1" disabled={loading}>
                        {loading ? "Creating account…" : "Create account"}
                    </button>
                </form>

                <p className="muted text-c mt-3">
                    Already have an account?{" "}
                    <Link to="/login" className="gradient-text" style={{ fontWeight: 700 }}>
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    );
}
