
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const options = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/[0.04]">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          title={label}
          aria-label={`${label} theme`}
          aria-pressed={theme === value}
          className={`rounded-lg p-2 transition ${
            theme === value
              ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
              : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
          }`}
        >
          <Icon size={17} />
        </button>
      ))}
    </div>
  );
}
