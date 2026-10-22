import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function scoreFromFeedback(feedback) {
  const match = String(feedback || "").match(
    /OVERALL SCORE:\s*\**\s*(\d{1,3})\s*\/\s*100/i,
  );
  return match ? Math.min(100, Number(match[1])) : null;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "⌂" },
  { id: "interviews", label: "All Interviews", icon: "▣" },
  { id: "candidates", label: "Candidates", icon: "♟" },
  { id: "analytics", label: "Analytics", icon: "▥" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

export default function AdminDashboard({ user, onLogout, onExitAdmin }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [overview, setOverview] = useState({
    total_candidates: 0,
    total_interviews: 0,
    average_score: null,
    today_interviews: 0,
  });
  const [interviews, setInterviews] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [overviewResponse, interviewsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/overview`),
        fetch(`${API_BASE_URL}/api/admin/interviews?limit=500`),
      ]);
      if (!overviewResponse.ok || !interviewsResponse.ok)
        throw new Error(
          "Admin data load nahi hua. Backend aur MongoDB check karo.",
        );
      const overviewData = await overviewResponse.json();
      const interviewsData = await interviewsResponse.json();
      setOverview(overviewData.statistics || {});
      setInterviews(interviewsData.interviews || []);
    } catch (err) {
      setError(err.message || "Could not load admin data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return interviews;
    return interviews.filter((item) =>
      `${item.candidate_name} ${item.email} ${item.interview_type} ${item.language}`
        .toLowerCase()
        .includes(term),
    );
  }, [interviews, search]);

  const candidates = useMemo(() => {
    const map = new Map();
    interviews.forEach((item) => {
      const key = (item.candidate_name || "Candidate").trim();
      if (!map.has(key))
        map.set(key, {
          name: key,
          email: item.email || "—",
          count: 0,
          scores: [],
        });
      const entry = map.get(key);
      entry.count += 1;
      const score = item.score ?? scoreFromFeedback(item.feedback);
      if (score !== null && score !== undefined) entry.scores.push(score);
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [interviews]);

  async function viewInterview(item) {
    setSelected(item);
    setDetailLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/interviews/${encodeURIComponent(item.id)}`,
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.detail || "Could not load interview details.");
      setSelected(data.interview);
    } catch (err) {
      setError(err.message || "Could not load interview details.");
    } finally {
      setDetailLoading(false);
    }
  }

  const cards = [
    {
      label: "Total Candidates",
      value: overview.total_candidates ?? 0,
      icon: "♟",
      tone: "blue",
    },
    {
      label: "Total Interviews",
      value: overview.total_interviews ?? interviews.length,
      icon: "▣",
      tone: "violet",
    },
    {
      label: "Avg. Score",
      value:
        overview.average_score == null ? "—" : `${overview.average_score}%`,
      icon: "↓",
      tone: "amber",
    },
    {
      label: "Today's Interviews",
      value: overview.today_interviews ?? 0,
      icon: "▣",
      tone: "green",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 md:flex">
      <aside className="flex w-full shrink-0 flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white md:min-h-screen md:w-[280px]">
        <div className="flex h-[90px] items-center gap-3 border-b border-white/10 px-6">
          <span className="text-4xl text-violet-400">🎙</span>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
              AI BPO Interview
            </h1>
            <p className="mt-1 text-xs text-slate-400">ADMIN CONSOLE</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-3 md:block md:space-y-2 md:overflow-visible md:pt-10">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSelected(null);
              }}
              className={`flex shrink-0 items-center gap-4 rounded-xl px-4 py-3.5 text-left text-sm font-semibold transition md:w-full md:text-base ${activeTab === item.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/30" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
            >
              <span className="w-6 text-xl">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-white/10 p-5 md:block">
          <p className="truncate text-sm font-semibold">
            {user?.displayName || "Admin"}
          </p>
          <p className="mt-1 truncate text-xs text-slate-400">{user?.email}</p>
          <button
            onClick={onExitAdmin}
            className="mt-4 w-full rounded-lg border border-white/15 px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5"
          >
            ← Candidate workspace
          </button>
          <button
            onClick={onLogout}
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5"
          >
            ↪ Logout
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-9">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-indigo-600">
              AI VOICE INTERVIEW
            </p>
            <h2 className="mt-2 text-3xl font-extrabold capitalize tracking-tight">
              {activeTab === "dashboard"
                ? "Dashboard"
                : activeTab === "interviews"
                  ? "All Interviews"
                  : activeTab}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Manage candidates and review interview performance.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <div className="text-right">
              <p className="font-bold">Admin</p>
              <p className="max-w-48 truncate text-xs text-slate-500">
                {user?.email}
              </p>
            </div>
            <img
              src={user?.photoURL || "https://placehold.co/48x48"}
              alt="Admin profile"
              className="h-12 w-12 rounded-full border border-slate-200 object-cover"
            />
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Dismiss error">
              ✕
            </button>
          </div>
        )}

        {activeTab === "dashboard" && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              {cards.map((card) => (
                <div
                  key={card.label}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-bold ${card.tone === "blue" ? "bg-blue-100 text-blue-600" : card.tone === "violet" ? "bg-violet-100 text-violet-600" : card.tone === "amber" ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}
                  >
                    {card.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      {card.label}
                    </p>
                    <p className="mt-1 text-3xl font-extrabold tracking-tight">
                      {loading ? "…" : card.value}
                    </p>
                  </div>
                </div>
              ))}
            </section>
            <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-5">
                <div>
                  <h3 className="text-xl font-extrabold">Recent Interviews</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Latest candidate interview activity
                  </p>
                </div>
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  {loading ? "Loading…" : "↻ Refresh"}
                </button>
              </div>
              <InterviewTable
                rows={interviews.slice(0, 10)}
                loading={loading}
                onView={viewInterview}
              />
            </section>
          </>
        )}

        {(activeTab === "interviews" || activeTab === "candidates") && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
              <div>
                <h3 className="text-xl font-extrabold">
                  {activeTab === "candidates" ? "Candidates" : "All Interviews"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {activeTab === "candidates"
                    ? `${candidates.length} unique candidates`
                    : `${filtered.length} interview records`}
                </p>
              </div>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, type..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:max-w-sm"
              />
            </div>
            {activeTab === "interviews" ? (
              <InterviewTable
                rows={filtered}
                loading={loading}
                onView={viewInterview}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-5 py-4">Candidate</th>
                      <th className="px-5 py-4">Email</th>
                      <th className="px-5 py-4">Interviews</th>
                      <th className="px-5 py-4">Average Score</th>
                      <th className="px-5 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates
                      .filter((c) =>
                        `${c.name} ${c.email}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                      )
                      .map((candidate) => (
                        <tr
                          key={candidate.name}
                          className="border-t border-slate-100"
                        >
                          <td className="px-5 py-4 font-bold">
                            {candidate.name}
                          </td>
                          <td className="px-5 py-4 text-slate-500">
                            {candidate.email}
                          </td>
                          <td className="px-5 py-4">{candidate.count}</td>
                          <td className="px-5 py-4 font-bold text-emerald-700">
                            {candidate.scores.length
                              ? `${(candidate.scores.reduce((a, b) => a + b, 0) / candidate.scores.length).toFixed(1)}%`
                              : "—"}
                          </td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => {
                                setActiveTab("interviews");
                                setSearch(candidate.name);
                              }}
                              className="rounded-full bg-indigo-50 px-4 py-2 font-bold text-indigo-700 hover:bg-indigo-100"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!loading && candidates.length === 0 && (
                  <EmptyState text="No candidates found yet." />
                )}
              </div>
            )}
          </section>
        )}

        {activeTab === "analytics" && (
          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-extrabold">Score Overview</h3>
              <p className="mt-1 text-sm text-slate-500">
                Distribution of recorded interview scores
              </p>
              <div className="mt-6 space-y-4">
                {[
                  {
                    label: "80–100 Excellent",
                    min: 80,
                    max: 101,
                    color: "bg-emerald-500",
                  },
                  {
                    label: "60–79 Good",
                    min: 60,
                    max: 80,
                    color: "bg-blue-500",
                  },
                  {
                    label: "40–59 Average",
                    min: 40,
                    max: 60,
                    color: "bg-amber-500",
                  },
                  {
                    label: "0–39 Needs improvement",
                    min: 0,
                    max: 40,
                    color: "bg-rose-500",
                  },
                ].map((band) => {
                  const count = interviews.filter((item) => {
                    const score =
                      item.score ?? scoreFromFeedback(item.feedback);
                    return (
                      score !== null && score >= band.min && score < band.max
                    );
                  }).length;
                  const percent = interviews.length
                    ? (count / interviews.length) * 100
                    : 0;
                  return (
                    <div key={band.label}>
                      <div className="mb-2 flex justify-between gap-3 text-sm">
                        <span className="text-slate-600">{band.label}</span>
                        <span className="font-bold">{count}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${band.color}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-extrabold">Quick Summary</h3>
              <div className="mt-5 space-y-4">
                {[
                  {
                    label: "Candidates",
                    value: overview.total_candidates ?? 0,
                  },
                  {
                    label: "Interviews completed",
                    value: overview.total_interviews ?? 0,
                  },
                  {
                    label: "Average score",
                    value:
                      overview.average_score == null
                        ? "—"
                        : `${overview.average_score}%`,
                  },
                  {
                    label: "Interviews today (UTC date)",
                    value: overview.today_interviews ?? 0,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex justify-between border-b border-slate-100 pb-3"
                  >
                    <span className="text-slate-500">{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === "settings" && (
          <section className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-extrabold">Admin Settings</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Signed in as {user?.email || "admin"}. Admin permissions should be
              verified by the backend before public deployment.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={loadData}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white hover:bg-indigo-500"
              >
                Refresh dashboard data
              </button>
              <button
                onClick={onExitAdmin}
                className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold hover:bg-slate-50"
              >
                Candidate workspace
              </button>
            </div>
          </section>
        )}
      </main>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <section className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Candidate details
                </p>
                <h3 className="mt-1 text-xl font-extrabold">
                  {selected.candidate_name || "Candidate"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selected.email || "Email not recorded"} ·{" "}
                  {formatDate(selected.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-full bg-slate-100 px-3 py-2 font-bold hover:bg-slate-200"
                aria-label="Close details"
              >
                ✕
              </button>
            </div>
            <div className="p-5 sm:p-7">
              {detailLoading ? (
                <p className="py-10 text-center text-slate-500">
                  Loading details…
                </p>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-4">
                    {[
                      {
                        label: "Interview Type",
                        value: selected.interview_type || "Voice Process",
                      },
                      {
                        label: "Language",
                        value: selected.language || "English",
                      },
                      {
                        label: "Difficulty",
                        value: selected.difficulty || "Beginner",
                      },
                      {
                        label: "Score",
                        value:
                          selected.score == null
                            ? "—"
                            : `${selected.score}/100`,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl bg-slate-50 p-4"
                      >
                        <p className="text-xs text-slate-500">{item.label}</p>
                        <p className="mt-1 font-extrabold">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6">
                    <h4 className="text-lg font-extrabold">AI Feedback</h4>
                    <pre className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 font-sans text-sm leading-7 text-slate-700">
                      {selected.feedback || "No feedback saved."}
                    </pre>
                  </div>
                  <div className="mt-6">
                    <h4 className="text-lg font-extrabold">
                      Candidate Answers / Transcript
                    </h4>
                    {selected.conversation?.length ? (
                      <div className="mt-3 space-y-3">
                        {selected.conversation.map((message, index) => (
                          <div
                            key={`${selected.id}-${index}`}
                            className={`rounded-xl p-4 ${message.role === "user" ? "bg-indigo-50" : "bg-slate-50"}`}
                          >
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              {message.role === "user"
                                ? "Candidate"
                                : message.role === "assistant"
                                  ? "AI Interviewer"
                                  : message.role}
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                              {message.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">
                        No transcript was saved.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function InterviewTable({ rows, loading, onView }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[850px] text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-5 py-4 font-bold">Name</th>
            <th className="px-5 py-4 font-bold">Email</th>
            <th className="px-5 py-4 font-bold">Interview Type</th>
            <th className="px-5 py-4 font-bold">Language</th>
            <th className="px-5 py-4 font-bold">Score</th>
            <th className="px-5 py-4 font-bold">Date</th>
            <th className="px-5 py-4 font-bold">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => {
            const score = item.score ?? scoreFromFeedback(item.feedback);
            return (
              <tr
                key={item.id}
                className="border-t border-slate-100 transition hover:bg-slate-50"
              >
                <td className="px-5 py-4 font-bold text-slate-800">
                  {item.candidate_name || "Candidate"}
                </td>
                <td className="px-5 py-4 text-slate-500">
                  {item.email || "—"}
                </td>
                <td className="px-5 py-4">
                  {item.interview_type || "Voice Process"}
                </td>
                <td className="px-5 py-4">{item.language || "English"}</td>
                <td
                  className={`px-5 py-4 font-extrabold ${score == null ? "text-slate-400" : score >= 70 ? "text-emerald-700" : score >= 50 ? "text-amber-700" : "text-slate-800"}`}
                >
                  {score == null ? "—" : score}
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-slate-500">
                  {formatDate(item.created_at)}
                </td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => onView(item)}
                    className="rounded-full bg-violet-100 px-5 py-2 font-bold text-indigo-700 transition hover:bg-violet-200"
                  >
                    View
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {loading && (
        <p className="p-8 text-center text-slate-500">
          Loading interview records…
        </p>
      )}
      {!loading && rows.length === 0 && (
        <EmptyState text="No interview records found." />
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="p-10 text-center text-slate-500">
      🎧<p className="mt-3 font-semibold">{text}</p>
    </div>
  );
}
