
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    signInWithCognito,
    signInWithPassword,
  } = useAuth();

  const from =
    (location.state as {
      from?: { pathname: string };
    } | null)?.from?.pathname || "/";

  const [mode, setMode] = useState<
    "signin" | "signup" | "forgot"
  >("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [remember, setRemember] =
    useState(true);

  const [busy, setBusy] =
    useState<"cognito" | "password" | false>(
      false,
    );

  const [error, setError] =
    useState<string | null>(null);

  const [info, setInfo] =
    useState<string | null>(null);

  /* =====================================================
     COGNITO HOSTED UI LOGIN
     ===================================================== */

  const handleCognito = async () => {
    setError(null);
    setInfo(null);

    setBusy("cognito");

    try {
      /*
       * This redirects the browser to the
       * Amazon Cognito Hosted UI.
       *
       * Cognito will show its own email/password
       * login page.
       */
      await signInWithCognito();

      /*
       * Normally this line is never reached because
       * the browser has already been redirected.
       */
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to open Amazon Cognito.",
      );

      setBusy(false);
    }
  };

  /* =====================================================
     DIRECT EMAIL/PASSWORD LOGIN
     ===================================================== */

  const handlePasswordLogin = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    setError(null);
    setInfo(null);

    if (!email || !password) {
      setError(
        "Email and password are required.",
      );
      return;
    }

    setBusy("password");

    try {
      await signInWithPassword(
        email.trim(),
        password,
      );

      /*
       * Cognito/Amplify controls the actual session.
       */
      void remember;

      navigate(from, {
        replace: true,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in with Cognito.",
      );
    } finally {
      setBusy(false);
    }
  };

  /* =====================================================
     FORGOT PASSWORD
     ===================================================== */

  const handleForgot = (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    setError(null);

    if (!email) {
      setError(
        "Enter your email to reset your password.",
      );
      return;
    }

    setInfo(
      "Password reset is not connected yet. We will connect it to Cognito next.",
    );
  };

  return (
    <div className="relative flex min-h-screen items-stretch bg-[#07090d] text-slate-200">
      {/* =================================================
          LEFT PANEL
          ================================================= */}

      <aside className="relative hidden w-1/2 overflow-hidden border-r border-[#1f2632] bg-gradient-to-b from-[#07090d] to-[#0b0e14] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div
          aria-hidden
          className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-3xl"
        />

        <div
          aria-hidden
          className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-3xl"
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-sky-500/80 to-indigo-600/80 text-xs font-bold text-white">
            SH
          </div>

          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-wide text-slate-100">
              SELF-HEALING INFRA
            </span>

            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              AWS Agent Console
            </span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-100">
              An AI agent that watches your AWS infrastructure — and fixes it
              the moment you say yes.
            </h1>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
              CloudWatch detects failures. Amazon Bedrock diagnoses them. You
              retain full control. One click remediates production.
            </p>
          </div>

          <div className="rounded-lg border border-[#1f2632] bg-[#0d1117]/70 p-4 backdrop-blur">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Self-healing pipeline
            </div>

            <ol className="space-y-2 text-xs">
              {[
                {
                  n: "01",
                  t: "CloudWatch Alarm",
                  c: "text-slate-300",
                },
                {
                  n: "02",
                  t: "EventBridge + Step Functions",
                  c: "text-slate-300",
                },
                {
                  n: "03",
                  t: "AI Diagnosis (Bedrock)",
                  c: "text-sky-300",
                },
                {
                  n: "04",
                  t: "Human Approval",
                  c: "text-amber-300",
                },
                {
                  n: "05",
                  t: "Apply-Fix Lambda",
                  c: "text-emerald-300",
                },
              ].map((step) => (
                <li
                  key={step.n}
                  className="flex items-center gap-3"
                >
                  <span className="font-mono text-[10px] text-slate-500">
                    {step.n}
                  </span>

                  <span
                    className={`font-medium ${step.c}`}
                  >
                    {step.t}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            All systems operational · ap-south-1
          </div>

          <div>SOC 2 · HIPAA-ready</div>
        </div>
      </aside>

      {/* =================================================
          RIGHT PANEL
          ================================================= */}

      <section className="flex w-full flex-col justify-between p-6 sm:p-10 lg:w-1/2 lg:p-16">
        {/* Mobile brand */}

        <div className="mb-10 flex items-center gap-3 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-sky-500/80 to-indigo-600/80 text-xs font-bold text-white">
            SH
          </div>

          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-wide text-slate-100">
              SELF-HEALING INFRA
            </span>

            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              AWS Agent Console
            </span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-sm flex-1">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
              {mode === "forgot"
                ? "Reset your password"
                : mode === "signup"
                  ? "Create your account"
                  : "Sign in to your console"}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {mode === "forgot"
                ? "Reset your Cognito account password."
                : mode === "signup"
                  ? "Create an account in the Self-Healing Infra Cognito user pool."
                  : "Authenticate securely with Amazon Cognito."}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          {info && (
            <div className="mb-4 rounded-md border border-sky-500/30 bg-sky-500/5 px-3 py-2 text-xs text-sky-300">
              {info}
            </div>
          )}

          {/* =================================================
              FORGOT PASSWORD
              ================================================= */}

          {mode === "forgot" ? (
            <form
              onSubmit={handleForgot}
              className="space-y-4"
            >
              <Field
                id="forgot-email"
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={setEmail}
                placeholder="you@company.com"
              />

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                    setInfo(null);
                  }}
                  className="text-sm text-slate-400 hover:text-slate-200"
                >
                  ← Back to sign in
                </button>

                <button
                  type="submit"
                  className="ml-auto rounded-md border border-[#2a3240] bg-[#11161f] px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:border-sky-500/40"
                >
                  Send reset link
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* =================================================
                  REAL COGNITO HOSTED UI BUTTON
                  ================================================= */}

              <button
                type="button"
                onClick={handleCognito}
                disabled={busy !== false}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-sky-500/40 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-200 transition-colors hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy === "cognito" ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-300/30 border-t-sky-300" />
                    Opening Cognito…
                  </>
                ) : (
                  "Login with Amazon Cognito"
                )}
              </button>

              {/* Divider */}

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#1f2632]" />

                <span className="text-[10px] uppercase tracking-wider text-slate-600">
                  or
                </span>

                <div className="h-px flex-1 bg-[#1f2632]" />
              </div>

              {/* =================================================
                  EMAIL / PASSWORD
                  ================================================= */}

              <form
                onSubmit={handlePasswordLogin}
                className="space-y-4"
              >
                <Field
                  id="email"
                  label="Work email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@company.com"
                />

                <Field
                  id="password"
                  label="Password"
                  type="password"
                  autoComplete={
                    mode === "signup"
                      ? "new-password"
                      : "current-password"
                  }
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                />

                {mode === "signin" && (
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <label className="flex items-center gap-2 text-slate-400">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) =>
                          setRemember(
                            e.target.checked,
                          )
                        }
                        className="h-3.5 w-3.5 rounded border-[#2a3240] bg-[#11161f] accent-sky-500"
                      />

                      Remember me
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setError(null);
                        setInfo(null);
                      }}
                      className="font-medium text-sky-400 hover:text-sky-300"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy !== false}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-[#2a3240] bg-[#11161f] px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-sky-500/40 hover:bg-[#151b25] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy === "password" ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300/30 border-t-slate-300" />
                      Signing in…
                    </>
                  ) : (
                    "Sign in with email"
                  )}
                </button>

                <div className="pt-2 text-center text-xs text-slate-500">
                  {mode === "signup" ? (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("signin");
                          setError(null);
                          setInfo(null);
                        }}
                        className="font-medium text-sky-400 hover:text-sky-300"
                      >
                        Sign in
                      </button>
                    </>
                  ) : (
                    <>
                      New to Self-Healing Infra?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("signup");
                          setError(null);
                          setInfo(null);
                        }}
                        className="font-medium text-sky-400 hover:text-sky-300"
                      >
                        Create account
                      </button>
                    </>
                  )}
                </div>
              </form>
            </>
          )}
        </div>

        {/* =================================================
            FOOTER
            ================================================= */}

        <div className="mt-10 flex flex-col items-center gap-1 text-[11px] text-slate-600 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="h-3.5 w-3.5 text-emerald-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect
                x="3"
                y="11"
                width="18"
                height="11"
                rx="2"
              />

              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>

            Secured by Amazon Cognito · TLS 1.3
          </div>

          <div>
            © 2026 Self-Healing Infra · v1.0.0
          </div>
        </div>
      </section>
    </div>
  );
}

/* =====================================================
   INPUT FIELD
   ===================================================== */

function Field({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
      >
        {label}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-md border border-[#2a3240] bg-[#0d1117] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
      />
    </div>
  );
}

