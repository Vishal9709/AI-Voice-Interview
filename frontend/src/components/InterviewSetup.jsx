import { useState } from "react";

function InterviewSetup({ onStart }) {
  const [language, setLanguage] = useState("English");
  const [interviewType, setInterviewType] = useState("Voice Process");
  const [difficulty, setDifficulty] = useState("Beginner");
  const [duration, setDuration] = useState("10");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();

    if (!language || !interviewType || !difficulty || !duration) {
      setError("Please select all interview settings.");
      return;
    }

    setError("");

    onStart({
      language,
      interviewType,
      difficulty,
      duration: Number(duration),
    });
  }

  const selectClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-violet-500";

  const labelClass = "text-sm font-semibold text-slate-200";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
          INTERVIEW CONFIGURATION
        </p>

        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
          Set up your interview
        </h1>

        <p className="mt-3 leading-7 text-slate-400">
          Customize your practice session before meeting your AI interviewer.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8"
      >
        <div className="mb-8 flex items-center gap-4 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-600/20 text-3xl">
            🎙️
          </div>

          <div>
            <h2 className="font-bold">AI Voice Interview</h2>
            <p className="mt-1 text-sm text-slate-400">
              Listen to questions and answer using your microphone.
            </p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="language" className={labelClass}>
              Interview Language
            </label>

            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={selectClass}
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
            </select>

            <p className="mt-2 text-xs text-slate-500">
              Choose the language you are comfortable speaking.
            </p>
          </div>

          <div>
            <label htmlFor="role" className={labelClass}>
              Interview Role
            </label>

            <select
              id="role"
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
              className={selectClass}
            >
              <option value="Voice Process">Voice Process</option>
              <option value="Customer Support">Customer Support</option>
              <option value="Sales">Sales</option>
              <option value="Technical Support">Technical Support</option>
            </select>

            <p className="mt-2 text-xs text-slate-500">
              Select the role you want to practice for.
            </p>
          </div>

          <div>
            <label htmlFor="difficulty" className={labelClass}>
              Difficulty Level
            </label>

            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className={selectClass}
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>

            <p className="mt-2 text-xs text-slate-500">
              Choose a level that matches your preparation.
            </p>
          </div>

          <div>
            <label htmlFor="duration" className={labelClass}>
              Interview Duration
            </label>

            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className={selectClass}
            >
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="15">15 minutes</option>
              <option value="20">20 minutes</option>
            </select>

            <p className="mt-2 text-xs text-slate-500">
              Select how long you want your practice session to be.
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-5 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="mt-8 border-t border-white/10 pt-6">
          <div className="mb-5 flex flex-wrap gap-2 text-xs text-slate-400">
            <span className="rounded-full border border-white/10 px-3 py-2">
              🎧 Voice-based
            </span>
            <span className="rounded-full border border-white/10 px-3 py-2">
              🌐 {language}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-2">
              ⏱️ {duration} minutes
            </span>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-violet-600 px-6 py-4 font-bold transition hover:bg-violet-500"
          >
            Start Interview →
          </button>

          <p className="mt-3 text-center text-xs text-slate-500">
            Make sure your microphone is connected before starting.
          </p>
        </div>
      </form>
    </div>
  );
}

export default InterviewSetup;
