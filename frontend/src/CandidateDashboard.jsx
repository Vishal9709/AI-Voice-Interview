import { useCallback, useEffect, useState } from "react";

const API_BASE_URL = "https://ai-voice-interview-kx0w.onrender.com";

function CandidateDashboard({ user, onStartInterview, onLogout }) {
  const [interviews, setInterviews] = useState([]);
  const [statistics, setStatistics] = useState({
    total_interviews: 0,
    average_score: null,
    best_score: null,
    scored_interviews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const candidateName =
    user?.displayName || user?.email?.split("@")[0] || "Candidate";

  const fetchHistory = useCallback(async () => {
    if (!candidateName || candidateName === "Candidate") {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const encodedName = encodeURIComponent(candidateName);

      const [historyResponse, statsResponse] = await Promise.all([
        fetch(
          `${API_BASE_URL}/api/interview/history/${encodedName}?limit=20`
        ),
        fetch(
          `${API_BASE_URL}/api/interview/statistics/${encodedName}`
        ),
      ]);

      if (!historyResponse.ok || !statsResponse.ok) {
        throw new Error(
          "Interview history load nahi hui. Backend aur API check karo."
        );
      }

      const historyData = await historyResponse.json();
      const statsData = await statsResponse.json();

      setInterviews(historyData.interviews || []);
      setStatistics(
        statsData.statistics || {
          total_interviews: 0,
          average_score: null,
          best_score: null,
          scored_interviews: 0,
        }
      );
    } catch (err) {
      console.error("Dashboard history error:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [candidateName]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const getScore = (feedback) => {
    const match = String(feedback || "").match(
      /OVERALL SCORE:\s*\**\s*(\d{1,3})\s*\/\s*100/i
    );

    return match ? Math.min(100, Number(match[1])) : null;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "Date unavailable";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "Date unavailable";

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatDuration = (seconds) => {
    const totalSeconds = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    return `${minutes}m ${remainingSeconds}s`;
  };

  const stats = [
    {
      label: "Total Interviews",
      value: statistics.total_interviews ?? interviews.length,
      icon: "🎙️",
    },
    {
      label: "Completed",
      value: interviews.length,
      icon: "✅",
    },
    {
      label: "Average Score",
      value:
        statistics.average_score != null
          ? `${statistics.average_score}/100`
          : "—",
      icon: "📊",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white md:flex">
      {/* Mobile Navbar */}
<div className="flex items-center justify-between border-b border-white/10 bg-slate-950 p-4 md:hidden">
  <h1 className="text-lg font-bold">🎙️ InterviewAI</h1>

  <button
    type="button"
    onClick={() => setMenuOpen(!menuOpen)}
    aria-label={menuOpen ? "Close menu" : "Open menu"}
    aria-expanded={menuOpen}
    className="rounded-lg border border-white/10 p-2 text-2xl hover:bg-white/10"
  >
    {menuOpen ? "✕" : "☰"}
  </button>
</div>
      {/* Left sidebar */}
      <aside
  className={`${
    menuOpen ? "block" : "hidden"
  } border-b border-white/10 p-6 md:block md:min-h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r`}
>
        <h1 className="text-xl font-bold">🎙️ InterviewAI</h1>

        <p className="mt-2 text-sm text-slate-400">
          BPO Interview Platform
        </p>

        <nav className="mt-8 space-y-2">
          <div className="rounded-xl bg-violet-600/20 px-4 py-3 text-violet-300">
            🏠 Dashboard
          </div>

          <button
            type="button"
            onClick={() =>
              document
                .getElementById("interview-history")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="w-full rounded-xl px-4 py-3 text-left text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            🎤 Interviews
          </button>

          <button
            type="button"
            onClick={() =>
              document
                .getElementById("interview-statistics")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="w-full rounded-xl px-4 py-3 text-left text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            📈 My Results
          </button>

          <button
            type="button"
            onClick={() =>
              document
                .getElementById("my-profile")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="w-full rounded-xl px-4 py-3 text-left text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            👤 My Profile
          </button>
        </nav>

        <button
          type="button"
          onClick={onLogout}
          className="mt-8 w-full rounded-xl border border-white/10 px-4 py-3 text-left transition hover:bg-white/5"
        >
          ↪ Logout
        </button>
      </aside>

      {/* Main dashboard */}
      <main className="min-w-0 flex-1 p-6 md:p-10">
        <header
          id="my-profile"
          className="flex flex-wrap items-center justify-between gap-4"
        >
          <div>
            <p className="text-sm text-violet-300">
              CANDIDATE WORKSPACE
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              Welcome back, {candidateName.split(" ")[0]}!
            </h2>

            <p className="mt-2 text-slate-400">
              Ready to improve your interview skills?
            </p>
          </div>

          <div className="flex items-center gap-3">
            <img
              src={user?.photoURL || "https://placehold.co/48x48"}
              alt="Candidate profile"
              className="h-12 w-12 rounded-full border border-white/10 object-cover"
            />

            <div>
              <p className="font-semibold">{candidateName}</p>
              <p className="max-w-48 truncate text-sm text-slate-400">
                {user?.email}
              </p>
            </div>
          </div>
        </header>

        {/* Start interview banner */}
        <section className="mt-10 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-900/50 to-slate-900 p-6 md:p-8">
          <p className="text-sm font-semibold text-violet-300">
            YOUR NEXT OPPORTUNITY STARTS HERE
          </p>

          <h3 className="mt-3 text-2xl font-bold md:text-3xl">
            Practice. Improve. Get Hired.
          </h3>

          <p className="mt-3 max-w-xl text-slate-300">
            Practice BPO interviews with an AI interviewer, answer by
            voice, and discover where you can improve.
          </p>

          <button
            type="button"
            onClick={onStartInterview}
            className="mt-6 rounded-xl bg-violet-600 px-6 py-3 font-bold text-white transition hover:bg-violet-500"
          >
            + Start New Interview
          </button>
        </section>

        {/* Statistics */}
        <section
          id="interview-statistics"
          className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <div className="flex items-center justify-between">
                <p className="text-slate-400">{stat.label}</p>
                <span className="text-2xl">{stat.icon}</span>
              </div>

              <p className="mt-4 text-3xl font-bold">
                {loading ? "..." : stat.value}
              </p>
            </div>
          ))}
        </section>

        {/* Best score */}
        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-slate-400">Personal Best</p>
          <p className="mt-2 text-2xl font-bold">
            {loading
              ? "..."
              : statistics.best_score != null
                ? `${statistics.best_score}/100`
                : "No score yet"}
          </p>
        </section>

        {/* Recent interviews */}
        <section id="interview-history" className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold">Interview History</h3>
              <p className="mt-1 text-sm text-slate-400">
                Your latest completed interviews and feedback
              </p>
            </div>

            <button
              type="button"
              onClick={fetchHistory}
              disabled={loading}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5 disabled:opacity-50"
            >
              {loading ? "Loading..." : "↻ Refresh"}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-4 rounded-2xl border border-white/10 p-8 text-center text-slate-400">
              Loading your interview history...
            </div>
          ) : interviews.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
              <div className="text-4xl">🎧</div>

              <h4 className="mt-4 text-lg font-semibold">
                Your journey starts here
              </h4>

              <p className="mt-2 text-slate-400">
                No interview history found for this account yet.
                Complete an interview to see your results here.
              </p>

              <button
                type="button"
                onClick={onStartInterview}
                className="mt-5 rounded-xl bg-violet-600 px-5 py-3 font-semibold hover:bg-violet-500"
              >
                Start Your First Interview
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {interviews.map((interview) => {
                const score = getScore(interview.feedback);

                return (
                  <article
                    key={interview.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-violet-400/30 md:p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h4 className="text-lg font-semibold">
                          {interview.interview_type || "Voice Process"}
                        </h4>

                        <p className="mt-1 text-sm text-slate-400">
                          {formatDate(interview.created_at)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-center">
                        <p className="text-xs text-violet-300">
                          Overall Score
                        </p>
                        <p className="mt-1 text-xl font-bold">
                          {score != null ? `${score}/100` : "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                      <div className="rounded-xl bg-slate-900 p-3">
                        <p className="text-slate-400">Difficulty</p>
                        <p className="mt-1 font-medium">
                          {interview.difficulty || "Beginner"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-900 p-3">
                        <p className="text-slate-400">Duration</p>
                        <p className="mt-1 font-medium">
                          {formatDuration(interview.duration_seconds)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-900 p-3">
                        <p className="text-slate-400">Messages</p>
                        <p className="mt-1 font-medium">
                          {interview.conversation?.length || 0}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedInterview(
                          selectedInterview?.id === interview.id
                            ? null
                            : interview
                        )
                      }
                      className="mt-5 rounded-xl border border-violet-400/30 px-4 py-2 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/10"
                    >
                      {selectedInterview?.id === interview.id
                        ? "Hide Feedback"
                        : "View Detailed Feedback"}
                    </button>

                    {selectedInterview?.id === interview.id && (
                      <div className="mt-5 rounded-xl border border-white/10 bg-slate-900 p-5">
                        <h5 className="font-semibold">
                          Interview Feedback
                        </h5>

                        <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-300">
                          {interview.feedback ||
                            "No feedback was saved for this interview."}
                        </pre>

                        {interview.conversation?.length > 0 && (
                          <details className="mt-5">
                            <summary className="cursor-pointer font-semibold text-violet-300">
                              View Conversation Transcript
                            </summary>

                            <div className="mt-4 space-y-3">
                              {interview.conversation.map((message, index) => (
                                <div
                                  key={`${interview.id}-${index}`}
                                  className="rounded-lg bg-white/[0.03] p-3"
                                >
                                  <p className="text-xs font-semibold uppercase text-slate-400">
                                    {message.role === "assistant"
                                      ? "AI Interviewer"
                                      : message.role === "user"
                                        ? "Candidate"
                                        : message.role}
                                  </p>

                                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                                    {message.content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default CandidateDashboard;