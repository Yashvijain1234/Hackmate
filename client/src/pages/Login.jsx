import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth, getErr } from "../context/AuthContext";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [form, setForm] = useState({ email: "", password: "" });
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setErr("");
        setLoading(true);
        try {
            await login(form);
            navigate(location.state?.from || "/dashboard");
        } catch (e) {
            setErr(getErr(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrap">
            <div className="card auth-card">
                <h1 className="mb-1">Welcome back</h1>
                <p className="subtitle mb-3">Log in to find your next hackathon team.</p>

                {err && <div className="alert alert-error">{err}</div>}

                <form onSubmit={submit}>
                    <div className="field">
                        <label className="label">Email</label>
                        <input
                            className="input"
                            type="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required
                        />
                    </div>
                    <div className="field">
                        <label className="label">Password</label>
                        <input
                            className="input"
                            type="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required
                        />
                    </div>
                    <button className="btn btn-primary btn-block mt-1" disabled={loading}>
                        {loading ? "Logging in…" : "Log in"}
                    </button>
                </form>

                <p className="muted text-c mt-3">
                    New here?{" "}
                    <Link to="/register" className="gradient-text" style={{ fontWeight: 700 }}>
                        Create an account
                    </Link>
                </p>
            </div>
        </div>
    );
}
