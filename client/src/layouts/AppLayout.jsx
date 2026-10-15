
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { socket } from "../services/socket";
import { api } from "../services/api";
import {
  BarChart3,
  FilePlus2,

  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";

import ThemeToggle from "../components/ThemeToggle";

const navItems = [
  { label: "Overview", to: "/", icon: LayoutDashboard },
 
];

const playNotificationSound = () => {
  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.setValueAtTime(
      660,
      context.currentTime + 0.12
    );

    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.15,
      context.currentTime + 0.02
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + 0.3
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + 0.3);

    oscillator.onended = () => {
      context.close().catch(() => {});
    };
  } catch (error) {
    console.warn("Notification sound could not play.", error);
  }
};

export default function AppLayout() {
    const { user,loading, logout } = useAuth();

const navigate = useNavigate();


if (loading) {
  return <div>Checking login...</div>;
}

if (!user) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Login required</h1>
        <p className="mt-2 text-slate-500">
          You need to log in to fill out this form.
        </p>

        <button
          onClick={() => navigate("/login")}
          className="mt-6 rounded-lg bg-violet-600 px-5 py-2.5 text-white"
        >
          Log in to continue
        </button>
      </div>
    </div>
  );
}

useEffect(() => {
  const handleNewResponse = async (event) => {
    playNotificationSound()
    const formId = event?.formId;
    if (!formId) return;

    let formTitle = event.formTitle || "Your form";

    try {
      const { data } = await api.get(`/forms/${formId}`);
      formTitle = data.form?.title || formTitle;
    } catch {
      // Still show the notification if the title cannot be loaded.
    }


    toast.custom(
  (t) => (
   
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900 relative">
          <button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    toast.dismiss(t.id);
  }}
  aria-label="Dismiss notification"
  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full absolute right-2 text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
>
  ×
</button>
          <div className="flex items-start gap-3">
            <div className="text-xl">📩</div>

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900 dark:text-white">
                New response received!
              </p>

              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                A new response was submitted to{" "}
                <strong>{formTitle}</strong>.
              </p>

              <button
                type="button"
                onClick={() => {
                  toast.dismiss(t);
                  navigate(`/builder/${formId}/responses`);
                }}
                className="mt-3 text-sm font-semibold text-violet-600 hover:underline dark:text-violet-400"
              >
                View responses →
              </button>
            

         


          </div>
        </div>
    </div>
  ),
  { duration: 5000,
     position: "bottom-right",
   }
);
  };

  socket.on("response:new", handleNewResponse);

  return () => {
    socket.off("response:new", handleNewResponse);
  };
}, [navigate,playNotificationSound]);

  const [mobileOpen, setMobileOpen] = useState(false);



  const sidebar = (
    <div className="flex h-full flex-col">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-3 px-6 py-6 text-left"
      >
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-600/20">
          <Sparkles size={21} />
        </span>
        <span>
          <span className="block text-lg font-extrabold tracking-tight">Formly</span>
          <span className="text-xs text-slate-500">Forms made simple</span>
        </span>
      </button>

      <div className="px-4 pb-4">
        <button
          onClick={() => navigate("/new")}
          className="btn-primary w-full py-3 shadow-lg shadow-violet-600/15"
        >
          <FilePlus2 size={18} /> Create a form
        </button>
      </div>

      <div className="px-4 pt-3">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          Workspace
        </p>

        <nav className="space-y-1">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-4">
        <div className="mb-4 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4 dark:border-violet-500/20 dark:from-violet-500/10 dark:to-transparent">
          <div className="mb-2 flex items-center gap-2 text-violet-700 dark:text-violet-300">
            <BarChart3 size={17} />
            <span className="text-sm font-bold">Make it meaningful</span>
          </div>
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            Collect feedback, learn from responses, and improve your ideas.
          </p>
        </div>

        <button
          onClick={() => navigate("/settings")}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.05]"
        >
          <Settings2 size={18} /> Settings
        </button>

        <div className="mt-3 flex items-center gap-3 border-t border-slate-200 pt-4 dark:border-white/10">
          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-violet-100 font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
            {(user?.profileImage && user.profileImage=="") ? (
              <img
                src={user.profileImage}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              user?.name?.charAt(0)?.toUpperCase() || "U"
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>

          <button
            onClick={logout}
            className="icon-btn"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0b10]">
      {mobileOpen && (
        <button
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[270px] border-r border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#101016] lg:block">
        {sidebar}
      </aside>

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] border-r border-slate-200 bg-white transition-transform dark:border-white/[0.08] dark:bg-[#101016] lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute right-3 top-4">
          <button className="icon-btn" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>
        {sidebar}
      </aside>

      <div className="lg:pl-[270px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0b0b10]/85 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              className="icon-btn lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Your workspace
            </span>
          </div>
          <ThemeToggle />
        </header>

        <main className="mx-auto max-w-[1500px] p-4 sm:p-8 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
