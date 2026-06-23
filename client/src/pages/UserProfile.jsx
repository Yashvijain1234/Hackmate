import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { getErr } from "../api/client";
import { Spinner, Avatar } from "../components/ui";

export default function UserProfile() {
    const { id } = useParams();
    const [u, setU] = useState(null);
    const [err, setErr] = useState("");

    useEffect(() => {
        api
            .get(`/users/${id}`)
            .then((r) => setU(r.data.data))
            .catch((e) => setErr(getErr(e)));
    }, [id]);

    if (err) return <div className="page"><div className="container"><div className="alert alert-error">{err}</div></div></div>;
    if (!u) return <Spinner />;

    const links = [
        ["GitHub", u.githubUrl],
        ["LinkedIn", u.linkedinUrl],
        ["Portfolio", u.portfolioUrl],
    ].filter(([, v]) => v);

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: 760 }}>
                <div className="card">
                    <div className="row wrap center" style={{ gap: 20 }}>
                        <Avatar src={u.avatar} name={u.userName} size={96} />
                        <div className="grow">
                            <h1>{u.userName}</h1>
                            <p className="subtitle">{u.bio || "No bio yet."}</p>
                            <div className="row wrap mt-2" style={{ gap: 8 }}>
                                <span className="badge badge-primary">{u.experienceLevel}</span>
                                {(u.preferredRoles || []).map((r) => (
                                    <span key={r} className="badge">{r}</span>
                                ))}
                                {u.collegeOrOrg && <span className="badge">🎓 {u.collegeOrOrg}</span>}
                            </div>
                        </div>
                    </div>

                    {u.skills?.length > 0 && (
                        <>
                            <div className="divider" />
                            <h3 className="mb-2">Skills</h3>
                            <div className="chips">
                                {u.skills.map((s) => (
                                    <span key={s} className="chip">{s}</span>
                                ))}
                            </div>
                        </>
                    )}

                    {links.length > 0 && (
                        <>
                            <div className="divider" />
                            <div className="row wrap">
                                {links.map(([label, url]) => (
                                    <a key={label} className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noreferrer">
                                        {label} ↗
                                    </a>
                                ))}
                            </div>
                        </>
                    )}

                    {u.teams?.length > 0 && (
                        <>
                            <div className="divider" />
                            <h3 className="mb-2">Teams</h3>
                            <div className="chips">
                                {u.teams.map((t) => (
                                    <Link key={t._id} to={`/teams/${t._id}`} className="chip">{t.name}</Link>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
