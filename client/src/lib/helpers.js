export const fmtDate = (d) =>
    d
        ? new Date(d).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
          })
        : "";

export const dateRange = (a, b) => {
    if (!a) return "";
    const start = fmtDate(a);
    const end = b ? fmtDate(b) : "";
    return end && end !== start ? `${start} – ${end}` : start;
};

export const timeAgo = (d) => {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
};

export const initials = (name = "") =>
    name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

export const statusBadgeClass = (status) =>
    ({
        Upcoming: "badge-primary",
        Ongoing: "badge-success",
        Completed: "badge",
        pending: "badge-warning",
        accepted: "badge-success",
        rejected: "badge-danger",
        cancelled: "badge",
    })[status] || "badge";

export const toList = (v) =>
    Array.isArray(v) ? v : typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];
