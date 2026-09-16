import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { cn } from "../utils/cn";

interface NavbarProps {
  systemStatus?: "Operational" | "Degraded" | "Major Outage";
}

export function Navbar({ systemStatus = "Operational" }: NavbarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const statusColor =
    systemStatus === "Operational"
      ? "bg-emerald-500"
      : systemStatus === "Degraded"
      ? "bg-amber-500"
      : "bg-red-500";

  const initials =
    user?.name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "U";

  const linkBase =
    "px-3 py-1.5 text-sm rounded-md transition-colors border border-transparent";

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#1f2632] bg-[#07090d]/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-sky-500/80 to-indigo-600/80 text-[11px] font-bold text-white">
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

          <nav className="hidden items-center gap-1 md:flex">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  linkBase,
                  isActive
                    ? "bg-[#11161f] text-slate-100 border-[#2a3240]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#11161f]"
                )
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/incidents"
              className={({ isActive }) =>
                cn(
                  linkBase,
                  isActive
                    ? "bg-[#11161f] text-slate-100 border-[#2a3240]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#11161f]"
                )
              }
            >
              Incidents
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                cn(
                  linkBase,
                  isActive
                    ? "bg-[#11161f] text-slate-100 border-[#2a3240]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#11161f]"
                )
              }
            >
              History
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-md border border-[#1f2632] bg-[#0d1117] px-3 py-1.5 text-xs sm:flex">
            <span className={cn("h-2 w-2 rounded-full", statusColor, "animate-pulse-dot")} />
            <span className="text-slate-300">{systemStatus}</span>
          </div>

          <div className="hidden items-center gap-2 rounded-md border border-[#1f2632] bg-[#0d1117] px-3 py-1.5 text-xs md:flex">
            <svg
              className="h-3.5 w-3.5 text-slate-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
              <path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" />
            </svg>
            <span className="text-slate-400">
              <span className="text-slate-500">Region</span>{" "}
              <span className="text-slate-200">ap-south-1</span>
            </span>
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="User menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2 rounded-md border border-[#1f2632] bg-[#0d1117] px-2 py-1.5 transition-colors hover:border-[#2a3240]"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/60 to-indigo-600/60 text-[10px] font-semibold text-white">
                {initials}
              </div>
              <div className="hidden flex-col items-start leading-tight pr-2 sm:flex">
                <span className="text-xs font-medium text-slate-200">
                  {user?.name ?? "User"}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500">
                  {user?.role ?? "member"}
                </span>
              </div>
              <svg
                className="mr-1 hidden h-3 w-3 text-slate-500 sm:block"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-md border border-[#2a3240] bg-[#0d1117] shadow-xl">
                  <div className="border-b border-[#1f2632] px-4 py-3">
                    <div className="text-sm font-medium text-slate-100">
                      {user?.name}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {user?.email}
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[#1f2632] bg-[#11161f] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      <svg
                        className="h-3 w-3 text-emerald-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      Signed in via {user?.signInMethod === "cognito" ? "Cognito SSO" : "Password"}
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs text-slate-400 hover:bg-[#11161f] hover:text-slate-200"
                      onClick={() => setMenuOpen(false)}
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 21a8 8 0 0116 0" />
                      </svg>
                      Account settings
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs text-slate-400 hover:bg-[#11161f] hover:text-slate-200"
                      onClick={() => setMenuOpen(false)}
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 15v2m0 0v2m0-2h2m-2 0h-2" />
                        <rect x="4" y="4" width="16" height="16" rx="2" />
                      </svg>
                      API keys
                    </button>
                  </div>
                  <div className="border-t border-[#1f2632] py-1">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs text-red-400 hover:bg-red-500/5 disabled:opacity-60"
                    >
                      {signingOut ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-400/30 border-t-red-400" />
                          Signing out…
                        </>
                      ) : (
                        <>
                          <svg
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                            <path d="M16 17l5-5-5-5" />
                            <path d="M21 12H9" />
                          </svg>
                          Sign out
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
