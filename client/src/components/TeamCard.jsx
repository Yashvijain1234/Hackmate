import { Link } from "react-router-dom";
import { Avatar } from "./ui";

export default function TeamCard({ team }) {
    const members = team.members || [];
    const full = members.length >= team.maxSize;
    return (
        <Link to={`/teams/${team._id}`} className="card card-hover col">
            <div className="row-between">
                <h3>{team.name}</h3>
                {team.isOpen && !full ? (
                    <span className="badge badge-success">Open</span>
                ) : (
                    <span className="badge">Full</span>
                )}
            </div>

            {team.hackathon?.name && (
                <div className="faint" style={{ fontSize: 13 }}>
                    🏆 {team.hackathon.name}
                </div>
            )}

            <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, minHeight: 40 }}>
                {team.description?.slice(0, 100) || "No pitch yet."}
                {team.description?.length > 100 ? "…" : ""}
            </p>

            {team.requiredRoles?.length > 0 && (
                <div>
                    <div className="faint" style={{ fontSize: 12, marginBottom: 5 }}>Looking for</div>
                    <div className="chips">
                        {team.requiredRoles.slice(0, 3).map((r) => (
                            <span key={r} className="badge badge-primary">{r}</span>
                        ))}
                    </div>
                </div>
            )}

            <div className="divider" />
            <div className="row-between center">
                <div className="avatar-stack">
                    {members.slice(0, 4).map((m, i) => (
                        <Avatar key={i} src={m.user?.avatar} name={m.user?.userName} size={30} />
                    ))}
                </div>
                <span className="faint" style={{ fontSize: 13 }}>
                    {members.length}/{team.maxSize} members
                </span>
            </div>
        </Link>
    );
}
