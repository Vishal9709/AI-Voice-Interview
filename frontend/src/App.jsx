import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { loginWithGoogle, logoutUser } from "./services/authService";

import InterviewSetup from "./components/InterviewSetup";
import VoiceInterview from "./components/VoiceInterview";
import CandidateDashboard from "./CandidateDashboard";
import AdminDashboard from "./AdminDashboard";

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [interviewSettings, setInterviewSettings] = useState(null);
  const [showInterview, setShowInterview] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [workspace, setWorkspace] = useState("candidate");

  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = Boolean(
    user?.email && adminEmails.includes(user.email.toLowerCase()),
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      setWorkspace("candidate");
    });
    return () => unsubscribe();
  }, []);

  async function handleGoogleLogin() {
    try {
      setLoading(true);
      setError("");
      const loggedInUser = await loginWithGoogle();
      setUser(loggedInUser);
    } catch (err) {
      console.error("Google login error:", err);
      setError("Login nahi hua. Please dobara try karo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await logoutUser();
      setUser(null);
      setInterviewSettings(null);
      setShowInterview(false);
      setShowSetup(false);
      setWorkspace("candidate");
      setError("");
    } catch (err) {
      console.error("Logout error:", err);
      setError("Logout nahi ho paya. Please dobara try karo.");
    }
  }

  function handleStartInterview() {
    setInterviewSettings(null);
    setShowInterview(false);
    setError("");
    setShowSetup(true);
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <p className="mt-4 text-slate-300">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-5 py-12 text-white">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-violet-700/20 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-blue-600/20 blur-[100px]" />
        <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl sm:p-10">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-2xl">
              🎙️
            </div>
            <div>
              <h1 className="text-xl font-bold">InterviewAI</h1>
              <p className="text-sm text-slate-400">
                BPO Interview Practice Platform
              </p>
            </div>
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
            Welcome to your next opportunity
          </p>
          <h2 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
            Speak with<span className="block text-violet-400">confidence.</span>
          </h2>
          <p className="mt-5 leading-7 text-slate-300">
            Practice real-world BPO interviews with an AI interviewer. Answer
            using your voice, build communication skills, and prepare for your
            next opportunity.
          </p>
          <div className="mt-7 space-y-3">
            {[
              {
                icon: "🎧",
                title: "Voice-based interviews",
                subtitle: "Listen and answer naturally",
              },
              {
                icon: "🌐",
                title: "Hindi and English",
                subtitle: "Practice in your preferred language",
              },
              {
                icon: "📈",
                title: "Interview improvement",
                subtitle: "Work towards stronger answers",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <span className="text-xl">{item.icon}</span>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-slate-400">{item.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
          {error && (
            <p
              className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
              role="alert"
            >
              {error}
            </p>
          )}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl bg-violet-600 px-5 py-4 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              "Signing in..."
            ) : (
              <>
                <span className="rounded bg-white px-2 py-1 text-sm font-bold text-slate-900">
                  G
                </span>
                Continue with Google
              </>
            )}
          </button>
          <p className="mt-5 text-center text-xs text-slate-500">
            Sign in securely to access your workspace.
          </p>
        </div>
      </div>
    );
  }

  if (showInterview && interviewSettings) {
    return (
      <VoiceInterview
        settings={interviewSettings}
        candidateName={user?.displayName || "Candidate"}
        onBack={() => {
          setShowInterview(false);
          setShowSetup(false);
          setInterviewSettings(null);
        }}
      />
    );
  }

  if (showSetup && !interviewSettings) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
        <div className="mx-auto max-w-4xl">
          <button
            onClick={() => setShowSetup(false)}
            className="mb-6 rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300"
          >
            ← Back to Dashboard
          </button>
          <InterviewSetup
            onStart={(settings) => {
              setInterviewSettings(settings);
              setShowSetup(false);
              setShowInterview(true);
            }}
          />
        </div>
      </div>
    );
  }

  if (interviewSettings) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
        <div className="mx-auto max-w-4xl">
          <button
            onClick={() => setInterviewSettings(null)}
            className="mb-6 rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5"
          >
            ← Back to Dashboard
          </button>
          <InterviewSetup
            onStart={(settings) => {
              setInterviewSettings(settings);
              setShowInterview(true);
            }}
          />
        </div>
      </div>
    );
  }

  if (isAdmin && workspace === "admin") {
    return (
      <AdminDashboard
        user={user}
        onLogout={handleLogout}
        onExitAdmin={() => setWorkspace("candidate")}
      />
    );
  }

  return (
    <div>
      {error && (
        <div className="fixed right-4 top-4 z-50 rounded-xl border border-red-500/20 bg-slate-900 p-4 text-sm text-red-300 shadow-xl">
          {error}
        </div>
      )}
      <>
        {isAdmin && (
          <div className="flex items-center justify-end gap-3 bg-slate-900 px-5 py-3 text-sm text-white">
            <span className="text-slate-300">Admin access</span>
            <button
              onClick={() => setWorkspace("admin")}
              className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-500"
            >
              Open Admin Dashboard →
            </button>
          </div>
        )}
        <CandidateDashboard
          user={user}
          onStartInterview={handleStartInterview}
          onLogout={handleLogout}
        />
      </>
    </div>
  );
}

export default App;
