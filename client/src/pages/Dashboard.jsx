
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Clock3,
  FilePlus2,
  FileText,
  LoaderCircle,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "../services/api";

const templates = [
  {
    title: "Event registration",
    description: "Collect attendee details for your next event.",
    icon: "🎟️",
    color: "bg-orange-50 dark:bg-orange-500/10",
    questions: [
      { title: "Full name", type: "short-answer", required: true, options: [] },
      { title: "Email address", type: "short-answer", required: true, options: [] },
      { title: "Will you attend?", type: "multiple-choice", required: true, options: ["Yes", "No"] },
    ],
  },
  {
    title: "Customer feedback",
    description: "Learn what your customers really think.",
    icon: "💬",
    color: "bg-sky-50 dark:bg-sky-500/10",
    questions: [
      { title: "How was your experience?", type: "multiple-choice", required: true, options: ["Excellent", "Good", "Average", "Poor"] },
      { title: "What can we improve?", type: "paragraph", required: false, options: [] },
    ],
  },
  {
    title: "Quick survey",
    description: "A simple starting point for any survey.",
    icon: "📊",
    color: "bg-emerald-50 dark:bg-emerald-500/10",
    questions: [
      { title: "What is your opinion?", type: "paragraph", required: true, options: [] },
      { title: "Anything else to share?", type: "short-answer", required: false, options: [] },
    ],
  },
];

function FormCard({ form, onOpen, onDelete }) {
  return (
    <article className="surface group overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/5 dark:hover:shadow-none">
      <div
        className="h-2"
        style={{ backgroundColor: form.theme?.color || "#7c3aed" }}
      />
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <button
            onClick={() => onOpen(form._id)}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-600 transition group-hover:scale-105 dark:bg-violet-500/10 dark:text-violet-300"
            aria-label={`Edit ${form.title}`}
          >
            <FileText size={22} />
          </button>

          <span
            className={`rounded-full px-3 py-1 text-[11px] font-bold ${
              form.isPublished
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400"
            }`}
          >
            {form.isPublished ? "Published" : "Draft"}
          </span>
        </div>

        <button
          onClick={() => onOpen(form._id)}
          className="mt-5 block w-full truncate text-left text-base font-bold hover:text-violet-600"
        >
          {form.title}
        </button>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500 dark:text-slate-400">
          {form.description || "No description yet. Open the editor to add one."}
        </p>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/[0.07]">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock3 size={14} />
            {new Date(form.updatedAt).toLocaleDateString()}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onDelete(form)}
              className="icon-btn h-9 w-9 hover:text-red-500"
              title="Delete form"
              aria-label={`Delete ${form.title}`}
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={() => onOpen(form._id)}
              className="icon-btn h-9 w-9 text-violet-600"
              title="Edit form"
              aria-label={`Edit ${form.title}`}
            >
              <ArrowUpRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
 useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    })})
  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/forms", {
        params: search.trim() ? { search: search.trim() } : {},
      });
      setForms(data.forms || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(loadForms, 250);
    return () => clearTimeout(timer);
  }, [loadForms]);

  const createForm = async (template) => {
    setCreating(true);
    try {
      const { data } = await api.post("/forms");
      const id = data.form._id;

      if (template) {
        await api.patch(`/forms/${id}`, {
          title: template.title,
          description: template.description,
          questions: template.questions,
        });
      }

      navigate(`/builder/${id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  const deleteForm = async (form) => {
    if (!window.confirm(`Delete "${form.title}" and all its responses?`)) return;

    try {
      await api.delete(`/forms/${form._id}`);
      setForms((items) => items.filter((item) => item._id !== form._id));
      toast.success("Form deleted.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const publishedCount = forms.filter((form) => form.isPublished).length;
  const draftCount = forms.length - publishedCount;

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-700 p-6 text-white shadow-xl shadow-violet-700/10 sm:p-9">
        <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-fuchsia-400/20 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-7 sm:flex-row sm:items-center">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">
              <Sparkles size={14} /> Your creative workspace
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Good ideas start
              <br className="hidden sm:block" /> with good questions.
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-violet-100 sm:text-base">
              Create a form, share it with the world, and bring your ideas to life.
            </p>
          </div>

          <button
            onClick={() => createForm()}
            disabled={creating}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-violet-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-50 disabled:opacity-60"
          >
            {creating ? <LoaderCircle className="animate-spin" size={18} /> : <Plus size={19} />}
            Blank form
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total forms", value: forms.length, icon: FileText },
          { label: "Published", value: publishedCount, icon: ArrowUpRight },
          { label: "Drafts", value: draftCount, icon: Clock3 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="surface flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
              <Icon size={21} />
            </div>
            <div>
              <p className="text-2xl font-extrabold">{value}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Start with a template</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              A useful starting point you can customize.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {templates.map((template) => (
            <button
              key={template.title}
              onClick={() => createForm(template)}
              disabled={creating}
              className="surface group flex items-start gap-4 p-5 text-left transition hover:-translate-y-1 hover:border-violet-200 dark:hover:border-violet-500/30"
            >
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl ${template.color}`}>
                {template.icon}
              </span>
              <span className="min-w-0">
                <span className="block font-bold group-hover:text-violet-600">{template.title}</span>
                <span className="mt-1 block text-sm leading-5 text-slate-500 dark:text-slate-400">
                  {template.description}
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-violet-600">
                  Use template <ArrowUpRight size={14} />
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Your forms</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              All your recent work in one place.
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your forms..."
              className="field pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoaderCircle size={28} className="animate-spin text-violet-600" />
          </div>
        ) : forms.length ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {forms.map((form) => (
              <FormCard
                key={form._id}
                form={form}
                onOpen={(id) => navigate(`/builder/${id}`)}
                onDelete={deleteForm}
              />
            ))}
          </div>
        ) : (
          <div className="surface flex flex-col items-center px-6 py-14 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
              <FilePlus2 size={28} />
            </div>
            <h3 className="mt-5 text-lg font-bold">
              {search ? "No matching forms" : "Your next great form starts here"}
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
              {search
                ? "Try another search term."
                : "Create a blank form or start with a template to collect your first responses."}
            </p>
            {!search && (
              <button onClick={() => createForm()} className="btn-primary mt-5">
                <Plus size={17} /> Create your first form
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
