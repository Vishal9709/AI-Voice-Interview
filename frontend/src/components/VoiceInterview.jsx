import { useCallback, useEffect, useRef, useState } from "react";

const API_URL = "https://ai-voice-interview-kx0w.onrender.com";

export default function VoiceInterview({
  settings = {},
  onBack,
  candidateName = "Vishal",
}) {
  const [status, setStatus] = useState("ready");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [muted, setMuted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(
    (Number(settings.duration) || 10) * 60,
  );

  const micStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const conversationRef = useRef([]);
  const activeRef = useRef(false);
  const busyRef = useRef(false);
  const listeningRef = useRef(false);
  const mutedRef = useRef(false);
  const aiSpeakingRef = useRef(false);
  const finishingRef = useRef(false);
  const restartTimerRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const timerRef = useRef(null);
  const finalTranscriptRef = useRef("");

  const language = settings.language || "English";
  const interviewType = settings.interviewType || "Voice Process";
  const difficulty = settings.difficulty || "Beginner";
  const interviewerName = "Praveen";

  const speechLanguage = language.toLowerCase() === "hindi" ? "hi-IN" : "en-IN";

  const addMessage = useCallback((role, content) => {
    setMessages((previous) => [
      ...previous,
      {
        role,
        content,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  }, []);

  const clearTimers = useCallback(() => {
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const releaseMicrophone = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
  }, []);

  const stopRecognition = useCallback(() => {
    listeningRef.current = false;

    try {
      recognitionRef.current?.stop();
    } catch {
      // Recognition may already have stopped.
    }
  }, []);

  const startListening = useCallback(() => {
    if (
      !activeRef.current ||
      mutedRef.current ||
      busyRef.current ||
      aiSpeakingRef.current ||
      !recognitionRef.current ||
      listeningRef.current
    ) {
      return;
    }

    try {
      listeningRef.current = true;
      setStatus("listening");
      recognitionRef.current.start();
    } catch (err) {
      listeningRef.current = false;

      if (err?.name !== "InvalidStateError") {
        setError(
          "Microphone recognition start nahi hua. Permission check karo.",
        );
      }
    }
  }, []);

  const scheduleListeningRestart = useCallback(() => {
    if (
      !activeRef.current ||
      mutedRef.current ||
      busyRef.current ||
      aiSpeakingRef.current
    ) {
      return;
    }

    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
    }

    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;

      if (
        activeRef.current &&
        !mutedRef.current &&
        !busyRef.current &&
        !aiSpeakingRef.current &&
        !listeningRef.current
      ) {
        startListening();
      }
    }, 350);
  }, [startListening]);

  const speak = useCallback(
    (text) => {
      if (!activeRef.current) return;

      clearTimers();
      aiSpeakingRef.current = true;

      // Keep the actual microphone stream open, but pause recognition
      // to avoid transcribing the interviewer's own voice as the answer.
      stopRecognition();
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = speechLanguage;
      utterance.rate = 0.95;
      utterance.pitch = 1;

      utterance.onstart = () => {
        if (!activeRef.current) return;

        aiSpeakingRef.current = true;
        setStatus("speaking");
      };

      utterance.onend = () => {
        aiSpeakingRef.current = false;

        if (!activeRef.current) return;

        if (mutedRef.current) {
          setStatus("paused");
          return;
        }

        scheduleListeningRestart();
      };

      utterance.onerror = (event) => {
        aiSpeakingRef.current = false;

        if (!activeRef.current) return;

        if (event.error !== "canceled" && event.error !== "interrupted") {
          scheduleListeningRestart();
        }
      };

      window.speechSynthesis.speak(utterance);
    },
    [clearTimers, scheduleListeningRestart, speechLanguage, stopRecognition],
  );

  const sendAnswer = useCallback(
    async (answer) => {
      if (!activeRef.current || busyRef.current) return;

      busyRef.current = true;
      clearTimers();
      setStatus("thinking");

      conversationRef.current = [
        ...conversationRef.current,
        { role: "user", content: answer },
      ];

      if (answer !== "[UNCLEAR_AUDIO]") {
        addMessage("candidate", answer);
      }

      try {
        const response = await fetch(`${API_URL}/api/interview/respond`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidate_name: candidateName,
            interviewer_name: interviewerName,
            language,
            interview_type: interviewType,
            difficulty,
            conversation: conversationRef.current.slice(0, -1),
            user_message: answer,
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (
          !response.ok ||
          !data.success ||
          typeof data.reply !== "string" ||
          !data.reply.trim()
        ) {
          throw new Error(
            data.detail ||
              data.error ||
              `AI response failed. HTTP ${response.status}`,
          );
        }

        const reply = data.reply.trim();

        conversationRef.current = [
          ...conversationRef.current,
          { role: "assistant", content: reply },
        ];

        addMessage("interviewer", reply);
        busyRef.current = false;

        if (activeRef.current) {
          speak(reply);
        }
      } catch (err) {
        busyRef.current = false;

        if (!activeRef.current) return;

        setError(err.message || "AI response nahi mila. Backend check karo.");
        setStatus("error");
      }
    },
    [
      addMessage,
      candidateName,
      clearTimers,
      difficulty,
      interviewType,
      language,
      speak,
    ],
  );

  const submitAnswer = useCallback(() => {
    if (!activeRef.current || busyRef.current) return;

    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const answer = finalTranscriptRef.current.trim();
    finalTranscriptRef.current = "";

    if (!answer) return;

    stopRecognition();
    void sendAnswer(answer);
  }, [sendAnswer, stopRecognition]);

  // Generate final feedback from the complete conversation transcript.
  const generateFeedback = useCallback(async () => {
    if (conversationRef.current.length === 0) {
      setError("Feedback ke liye interview transcript available nahi hai.");
      setStatus("feedback-error");
      return;
    }

    setFeedbackLoading(true);
    setError("");
    setStatus("generating-feedback");

    try {
      const response = await fetch(`${API_URL}/api/interview/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_name: candidateName,
          interviewer_name: interviewerName,
          language,
          interview_type: interviewType,
          difficulty,
          duration_seconds:
            (Number(settings.duration) || 10) * 60 - secondsLeft,
          conversation: conversationRef.current,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success || !data.feedback) {
        throw new Error(
          data.detail ||
            data.error ||
            `Feedback generation failed. HTTP ${response.status}`,
        );
      }

      setFeedback(data.feedback);
      setStatus("completed");
    } catch (err) {
      setError(err.message || "Feedback generate nahi ho paaya.");
      setStatus("feedback-error");
    } finally {
      setFeedbackLoading(false);
    }
  }, [
    candidateName,
    difficulty,
    interviewType,
    language,
    secondsLeft,
    settings.duration,
  ]);

  // Stop the call, release microphone resources and generate feedback.
  const finishInterview = useCallback(
    async (reason = "ended") => {
      if (finishingRef.current) return;

      finishingRef.current = true;
      activeRef.current = false;
      busyRef.current = false;
      listeningRef.current = false;
      aiSpeakingRef.current = false;
      mutedRef.current = false;

      clearTimers();

      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }

      try {
        recognitionRef.current?.abort();
      } catch {
        // Recognition may already have stopped.
      }

      window.speechSynthesis?.cancel();
      releaseMicrophone();
      setMuted(false);

      if (reason === "time") {
        setSecondsLeft(0);
      }

      await generateFeedback();
    },
    [clearTimers, generateFeedback, releaseMicrophone],
  );

  const startInterview = useCallback(async () => {
    if (activeRef.current) return;

    setError("");
    setFeedback("");
    setMessages([]);
    conversationRef.current = [];
    finalTranscriptRef.current = "";
    finishingRef.current = false;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Speech recognition supported nahi hai. Latest Google Chrome try karo.",
      );
      setStatus("error");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.speechSynthesis) {
      setError("Browser microphone ya speech output support nahi karta.");
      setStatus("error");
      return;
    }

    try {
      setStatus("connecting");

      // Keep the real microphone stream open for the entire call.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      micStreamRef.current = stream;

      const recognition = new SpeechRecognition();
      recognition.lang = speechLanguage;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        listeningRef.current = true;

        if (activeRef.current && !busyRef.current && !aiSpeakingRef.current) {
          setStatus("listening");
        }
      };

      recognition.onresult = (event) => {
        if (!activeRef.current || busyRef.current || aiSpeakingRef.current) {
          return;
        }

        let finalText = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0]?.transcript?.trim();

          if (result.isFinal && transcript) {
            finalText += `${transcript} `;
          }
        }

        if (finalText.trim()) {
          finalTranscriptRef.current += finalText;

          if (silenceTimerRef.current) {
            window.clearTimeout(silenceTimerRef.current);
          }

          // Submit after a short pause in the candidate's speech.
          silenceTimerRef.current = window.setTimeout(() => {
            submitAnswer();
          }, 1400);
        }
      };

      recognition.onerror = (event) => {
        listeningRef.current = false;

        if (!activeRef.current || event.error === "aborted") return;

        if (
          event.error === "not-allowed" ||
          event.error === "service-not-allowed"
        ) {
          setError(
            "Microphone permission denied. Browser settings mein microphone Allow karo.",
          );
          setStatus("error");
          return;
        }

        if (finalTranscriptRef.current.trim() && !busyRef.current) {
          submitAnswer();
        } else {
          scheduleListeningRestart();
        }
      };

      recognition.onend = () => {
        listeningRef.current = false;

        if (!activeRef.current || mutedRef.current) return;

        if (
          finalTranscriptRef.current.trim() &&
          !busyRef.current &&
          !aiSpeakingRef.current
        ) {
          submitAnswer();
          return;
        }

        scheduleListeningRestart();
      };

      recognitionRef.current = recognition;

      activeRef.current = true;
      busyRef.current = true;
      mutedRef.current = false;
      aiSpeakingRef.current = false;

      setMuted(false);
      setSecondsLeft((Number(settings.duration) || 10) * 60);

      const response = await fetch(`${API_URL}/api/interview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_name: candidateName,
          interviewer_name: interviewerName,
          language,
          interview_type: interviewType,
          difficulty,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.message) {
        throw new Error(
          data.detail || `Interview start failed. HTTP ${response.status}`,
        );
      }

      const firstQuestion = data.message;

      if (typeof firstQuestion !== "string" || !firstQuestion.trim()) {
        throw new Error("AI interviewer did not return a valid greeting.");
      }

      const greeting = firstQuestion.trim();

      conversationRef.current = [{ role: "assistant", content: greeting }];

      addMessage("interviewer", greeting);
      busyRef.current = false;
      speak(greeting);
    } catch (err) {
      activeRef.current = false;
      busyRef.current = false;
      aiSpeakingRef.current = false;

      try {
        recognitionRef.current?.abort();
      } catch {
        // Ignore cleanup errors.
      }

      releaseMicrophone();

      setError(
        err.name === "NotAllowedError"
          ? "Microphone permission Allow karo aur dobara start karo."
          : err.message || "Interview start nahi ho paaya.",
      );
      setStatus("error");
    }
  }, [
    addMessage,
    candidateName,
    difficulty,
    interviewType,
    language,
    releaseMicrophone,
    scheduleListeningRestart,
    settings.duration,
    speak,
    speechLanguage,
    submitAnswer,
  ]);

  const toggleMute = () => {
    const nextMuted = !mutedRef.current;

    mutedRef.current = nextMuted;
    setMuted(nextMuted);

    if (nextMuted) {
      stopRecognition();
      window.speechSynthesis.cancel();
      aiSpeakingRef.current = false;
      setStatus("paused");

      // The actual microphone stream intentionally stays open.
    } else if (activeRef.current && !busyRef.current) {
      scheduleListeningRestart();
    }
  };

  // Start countdown during the active interview and stop at zero.
  useEffect(() => {
    const runningStatuses = [
      "speaking",
      "listening",
      "thinking",
      "paused",
      "error",
    ];

    if (!runningStatuses.includes(status) || secondsLeft <= 0) return;

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((previous) => {
        if (previous <= 1) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }

          if (activeRef.current) {
            void finishInterview("time");
          }

          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status, secondsLeft <= 0, finishInterview]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      listeningRef.current = false;

      clearTimers();

      try {
        recognitionRef.current?.abort();
      } catch {
        // Ignore cleanup errors.
      }

      window.speechSynthesis?.cancel();
      releaseMicrophone();

      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [clearTimers, releaseMicrophone]);

  const formattedTime = `${String(Math.floor(secondsLeft / 60)).padStart(
    2,
    "0",
  )}:${String(secondsLeft % 60).padStart(2, "0")}`;

  const statusText =
    {
      ready: "Ready to start",
      connecting: "Connecting to interviewer...",
      speaking: "Praveen is speaking",
      listening: "Listening to your answer",
      thinking: "Praveen is thinking...",
      paused: "Recognition paused — microphone stream retained",
      "generating-feedback": "Generating interview feedback...",
      completed: "Interview completed",
      ended: "Interview ended",
      "feedback-error": "Could not generate feedback",
      error: "Something went wrong",
    }[status] || "Ready";

  const isFinished = status === "completed" || status === "ended";
  const isGeneratingFeedback =
    status === "generating-feedback" || feedbackLoading;

  // --------------------------------------------------
  // Feedback screen
  // --------------------------------------------------

  if (isGeneratingFeedback) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
        <div className="mb-6 h-14 w-14 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-400" />

        <h1 className="text-2xl font-bold">Evaluating your interview</h1>

        <p className="mt-3 max-w-md text-slate-400">
          Praveen is reviewing your answers and preparing personalized feedback.
          Please wait.
        </p>
      </div>
    );
  }

  if (feedback) {
    const scoreMatch = feedback.match(
      /OVERALL SCORE:?\*{0,2}\s*(\d{1,3})\s*\/\s*100/i,
    );

    const score = scoreMatch ? Math.min(100, Number(scoreMatch[1])) : null;

    return (
      <div className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
              Interview completed
            </p>

            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
              Your Interview Feedback
            </h1>

            <p className="mt-3 text-slate-400">
              Candidate: {candidateName} · {interviewType}
            </p>
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-8">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full border-4 border-cyan-400/50 bg-cyan-400/10">
                <span className="text-3xl font-bold">
                  {score === null ? "—" : score}
                </span>
                <span className="text-xs text-slate-400">out of 100</span>
              </div>

              <div>
                <h2 className="text-xl font-semibold">Interview evaluation</h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Your evaluation is based on the interview transcript. Vocal
                  qualities cannot be reliably assessed from text alone.
                </p>
              </div>
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              <h2 className="mb-4 text-lg font-semibold">Detailed feedback</h2>

              <div className="space-y-4 text-sm leading-7 text-slate-200">
                {feedback
                  .replace(/\r/g, "")
                  .replace(/^---+\s*$/gm, "")
                  .split(/\n+/)
                  .map((line, index) => {
                    const cleanLine = line
                      .replace(/^#{1,6}\s*/, "")
                      .replace(/\*\*/g, "")
                      .trim();

                    if (!cleanLine) return null;

                    const isHeading =
                      /^(OVERALL SCORE|COMMUNICATION|CLARITY|CONFIDENCE|ANSWER QUALITY|STRENGTHS|AREAS TO IMPROVE|SUGGESTIONS|FINAL SUMMARY):?$/i.test(
                        cleanLine,
                      );

                    if (isHeading) {
                      return (
                        <h3
                          key={index}
                          className="pt-2 text-base font-semibold text-cyan-300"
                        >
                          {cleanLine}
                        </h3>
                      );
                    }

                    return (
                      <p key={index} className="break-words">
                        {cleanLine.replace(/^[-*]\s*/, "• ")}
                      </p>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => {
                setFeedback("");
                setFeedbackLoading(false);
                setError("");
                setMessages([]);
                conversationRef.current = [];
                finalTranscriptRef.current = "";
                finishingRef.current = false;
                setSecondsLeft((Number(settings.duration) || 10) * 60);
                setStatus("ready");
              }}
              className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Practice Again
            </button>

            <button
              onClick={() => onBack?.()}
              className="rounded-xl border border-white/15 px-6 py-3 hover:bg-white/10"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main interview screen

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => {
              if (activeRef.current) {
                endInterviewSafely();
              }

              onBack?.();
            }}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            ← Back to Dashboard
          </button>

          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-400">
              AI Voice Interview
            </p>
            <p className="mt-1 text-lg font-semibold">{interviewType}</p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                LIVE INTERVIEW
              </span>

              <span className="font-mono text-xl">{formattedTime}</span>
            </div>

            <div className="my-10 flex flex-col items-center text-center">
              <div className="flex h-36 w-36 items-center justify-center rounded-full border border-cyan-300/30 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 shadow-[0_0_45px_rgba(34,211,238,0.12)]">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-800 text-4xl">
                  🎙️
                </div>
              </div>

              <h1 className="mt-6 text-2xl font-bold">{interviewerName}</h1>

              <p className="mt-1 text-sm text-slate-400">Your AI interviewer</p>

              <div className="mt-5 flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    status === "listening"
                      ? "animate-pulse bg-green-400"
                      : status === "speaking"
                        ? "bg-cyan-400"
                        : status === "error"
                          ? "bg-red-400"
                          : "bg-amber-400"
                  }`}
                />

                {statusText}
              </div>

              <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
                {status === "listening"
                  ? "Speak naturally. Pause briefly when you finish your answer."
                  : status === "speaking"
                    ? "Listen to Praveen. Your microphone stream remains active."
                    : status === "thinking"
                      ? "Praveen is preparing the next response."
                      : status === "paused"
                        ? "Resume recognition when you are ready."
                        : "Start the interview when you are ready."}
              </p>
            </div>

            {status === "ready" && (
              <button
                onClick={startInterview}
                className="w-full rounded-2xl bg-cyan-400 px-5 py-4 font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Start Interview
              </button>
            )}

            {!isFinished &&
              status !== "ready" &&
              status !== "feedback-error" && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={toggleMute}
                    disabled={!activeRef.current}
                    className="rounded-xl border border-white/10 px-4 py-3 hover:bg-white/10 disabled:opacity-50"
                  >
                    {muted ? "▶ Resume Recognition" : "Ⅱ Pause Recognition"}
                  </button>

                  <button
                    onClick={() => void finishInterview("ended")}
                    disabled={finishingRef.current}
                    className="rounded-xl bg-red-500/15 px-4 py-3 text-red-300 hover:bg-red-500/25 disabled:opacity-50"
                  >
                    End Interview
                  </button>
                </div>
              )}

            {error && (
              <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-200">
                {error}
              </div>
            )}

            {status === "feedback-error" && (
              <button
                onClick={() => {
                  finishingRef.current = false;
                  void generateFeedback();
                }}
                className="mt-4 w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Retry Feedback
              </button>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 p-4">
                <p className="text-xs text-slate-400">Candidate</p>
                <p className="mt-1 truncate font-medium">{candidateName}</p>
              </div>

              <div className="rounded-xl bg-white/5 p-4">
                <p className="text-xs text-slate-400">Difficulty</p>
                <p className="mt-1 font-medium">{difficulty}</p>
              </div>

              <div className="rounded-xl bg-white/5 p-4">
                <p className="text-xs text-slate-400">Language</p>
                <p className="mt-1 font-medium">{language}</p>
              </div>

              <div className="rounded-xl bg-white/5 p-4">
                <p className="text-xs text-slate-400">Format</p>
                <p className="mt-1 font-medium">Voice conversation</p>
              </div>
            </div>
          </section>

          <section className="flex min-h-[500px] flex-col rounded-3xl border border-white/10 bg-slate-900 p-5 sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <h2 className="text-lg font-semibold">Conversation</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Interview transcript
                </p>
              </div>

              <span className="rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-400">
                {messages.length} messages
              </span>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto py-5">
              {messages.length === 0 && (
                <div className="flex min-h-64 flex-col items-center justify-center text-center">
                  <div className="text-4xl">💬</div>

                  <p className="mt-4 font-medium">
                    Your conversation will appear here
                  </p>

                  <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
                    Start the interview and answer Praveen using your
                    microphone.
                  </p>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={`${index}-${message.role}`}
                  className={`flex ${
                    message.role === "candidate"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-4 py-3 ${
                      message.role === "candidate"
                        ? "bg-cyan-400/15 text-cyan-50"
                        : "border border-white/10 bg-slate-800 text-slate-100"
                    }`}
                  >
                    <p className="mb-2 text-xs font-semibold text-slate-400">
                      {message.role === "candidate" ? "You" : interviewerName}
                      <span className="ml-2 font-normal">{message.time}</span>
                    </p>

                    <p className="whitespace-pre-wrap text-sm leading-6">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}

              {status === "thinking" && (
                <div className="text-sm text-cyan-300">
                  Praveen is thinking...
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-sm font-medium text-slate-200">
                🎙️ Automatic voice conversation
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                No typing required. The microphone stream stays active until the
                call ends, although browser speech recognition may independently
                restart its listening session.
              </p>
            </div>
          </section>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          Keep this tab open. Microphone permission and internet access are
          required.
        </p>
      </div>
    </div>
  );

  // End a call without generating feedback when navigating away.
  function endInterviewSafely() {
    activeRef.current = false;
    busyRef.current = false;
    listeningRef.current = false;
    aiSpeakingRef.current = false;
    clearTimers();

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      recognitionRef.current?.abort();
    } catch {
      // Ignore cleanup errors.
    }

    window.speechSynthesis?.cancel();
    releaseMicrophone();
  }
}
