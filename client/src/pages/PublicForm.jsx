
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle2,
  FileText,
  Home,
  LoaderCircle,
  Send,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

import { api, getErrorMessage } from "../services/api";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";

export default function PublicForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authChecking } = useAuth();

  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState({});
  const [email, setEmail] = useState("");
  const [sendCopy, setSendCopy] = useState(false);
  const [alreadyResponded, setAlreadyResponded] = useState(false);

  useEffect(() => {
    setEmail(user?.email ?? "");
  }, [user?.email]);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setForm(null);
    setAnswers({});
    setSubmitted(false);
    setSendCopy(false);
    setAlreadyResponded(false);

    api
      .get(`/forms/public/${id}`)
      .then(({ data }) => {
        if (active) setForm(data.form ?? null);
      })
      .catch((error) => {
        if (active) {
          toast.error(getErrorMessage(error));
          setForm(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const questions = useMemo(() => {
    const list = [...(form?.questions ?? [])];

    if (form?.settings?.shuffleQuestions) {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    }

    return list;
  }, [form]);

  const ownerId =
    form?.owner?._id ??
    form?.owner?.id ??
    form?.owner ??
    form?.createdBy?._id ??
    form?.createdBy?.id ??
    form?.createdBy ??
    form?.userId?._id ??
    form?.userId;

  const currentUserId = user?._id ?? user?.id;

  const isOwner = Boolean(
    ownerId &&
      currentUserId &&
      String(ownerId) === String(currentUserId)
  );

  useEffect(() => {
    if (loading || authChecking || !form || !isOwner) return;
    navigate(`/builder/${id}`, { replace: true });
  }, [loading, authChecking, form, isOwner, id, navigate]);

  const updateAnswer = (questionId, value) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!form || isOwner || submitting || alreadyResponded) return;

    if (sendCopy && !user?.email) {
      toast.error("Please log in to receive a copy by email.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (form.settings?.collectEmail && !normalizedEmail) {
      toast.error("Please enter your email address.");
      return;
    }

    if (
      form.settings?.limitOneResponse &&
      !form.settings?.collectEmail &&
      !user?._id &&
      !user?.id
    ) {
      toast.error("Please log in to respond to this form.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        answers: questions.map((question) => ({
          questionId: question._id,
          value: answers[question._id] ?? "",
        })),
        ...(form.settings?.collectEmail
          ? { respondentEmail: normalizedEmail }
          : {}),
        sendCopy,
      };

      await api.post(`/responses/${id}`, payload);

      setSubmitted(true);
      toast.success("Your response has been submitted!");
    } catch (error) {
      const status = error?.response?.status;
      const code = error?.response?.data?.code;

      if (status === 409 || code === "ALREADY_RESPONDED") {
        setAlreadyResponded(true);
        toast.error(
          error?.response?.data?.message ||
            "You have already submitted a response to this form."
        );
      } else if (status === 401 || code === "LOGIN_REQUIRED") {
        toast.error(
          error?.response?.data?.message ||
            "Please log in to respond to this form."
        );
      } else {
        toast.error(getErrorMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (question) => {
    const value = answers[question._id] ?? "";

    const common = {
      className: "field",
      required: Boolean(question.required),
    };

    if (question.type === "paragraph") {
      return (
        <textarea
          {...common}
          rows={4}
          value={value}
          onChange={(event) =>
            updateAnswer(question._id, event.target.value)
          }
          placeholder="Your answer"
          maxLength={10000}
        />
      );
    }

    if (question.type === "dropdown") {
      return (
        <select
          {...common}
          value={value}
          onChange={(event) =>
            updateAnswer(question._id, event.target.value)
          }
        >
          <option value="">Choose an option</option>
          {(question.options ?? []).map((option, index) => (
            <option key={`${option}-${index}`} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (question.type === "multiple-choice") {
      return (
        <div className="space-y-3">
          {(question.options ?? []).map((option, index) => (
            <label
              key={`${option}-${index}`}
              className="flex cursor-pointer items-center gap-3 text-sm"
            >
              <input
                type="radio"
                name={question._id}
                value={option}
                required={Boolean(question.required) && !value}
                checked={value === option}
                onChange={() => updateAnswer(question._id, option)}
                className="h-4 w-4 accent-violet-600"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      );
    }

    if (question.type === "checkboxes") {
      const selected = Array.isArray(value) ? value : [];

      return (
        <div className="space-y-3">
          {(question.options ?? []).map((option, index) => (
            <label
              key={`${option}-${index}`}
              className="flex cursor-pointer items-center gap-3 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...selected, option]
                    : selected.filter((item) => item !== option);

                  updateAnswer(question._id, next);
                }}
                className="h-4 w-4 accent-violet-600"
              />
              <span>{option}</span>
            </label>
          ))}

          {question.required && selected.length === 0 && (
            <p className="text-xs text-slate-400">
              Select at least one option.
            </p>
          )}
        </div>
      );
    }

    const typeMap = {
      date: "date",
      time: "time",
      number: "number",
      "short-answer": "text",
      "file-upload": "text",
    };

    return (
      <input
        {...common}
        type={typeMap[question.type] || "text"}
        value={value}
        onChange={(event) =>
          updateAnswer(question._id, event.target.value)
        }
        placeholder={
          question.type === "file-upload"
            ? "File upload is not enabled yet"
            : "Your answer"
        }
        disabled={question.type === "file-upload"}
        maxLength={10000}
      />
    );
  };

  if (loading || authChecking) {
    return (
      <div className="grid min-h-screen place-items-center">
        <LoaderCircle
          size={30}
          className="animate-spin text-violet-600"
        />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <FileText size={36} className="mx-auto text-slate-400" />
          <h1 className="mt-4 text-2xl font-bold">Form unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">
            This form may have been unpublished or deleted.
          </p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="btn-primary mt-6"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isOwner) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-center">
          <LoaderCircle
            size={30}
            className="mx-auto animate-spin text-violet-600"
          />
          <p className="mt-3 text-sm text-slate-500">
            Opening form editor...
          </p>
        </div>
      </div>
    );
  }

  if (alreadyResponded) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-5 dark:bg-[#0b0b10]">
        <div className="surface w-full max-w-lg p-8 text-center sm:p-12">
          <CheckCircle2
            size={56}
            className="mx-auto text-emerald-500"
          />
          <h1 className="mt-5 text-2xl font-extrabold">
            Response already submitted
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            You have already submitted a response to this form. You cannot
            submit another response.
          </p>
          <Link to="/" className="btn-primary mt-6 inline-flex">
            <Home size={17} /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    const oneResponseByEmail =
      Boolean(form.settings?.limitOneResponse) &&
      Boolean(form.settings?.collectEmail);

    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-5 dark:bg-[#0b0b10]">
        <div className="surface w-full max-w-lg p-8 text-center sm:p-12">
          <CheckCircle2
            size={56}
            className="mx-auto text-emerald-500"
          />

          <h1 className="mt-5 text-2xl font-extrabold">
            Response submitted!
          </h1>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
            {form.settings?.confirmationMessage?.trim() ||
              "Your response has been recorded."}
          </p>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <p className="text-sm leading-6 text-amber-800 dark:text-amber-300">
              If you believe you submitted the wrong response, please contact
              the form owner for assistance.
            </p>
          </div>

          {oneResponseByEmail ? (
            <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
              This form allows only one response per email address. You can
              close this page.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAnswers({});
                setEmail(user?.email ?? "");
                setSendCopy(false);
                setSubmitted(false);
              }}
              className="btn-secondary mt-6"
            >
              Submit another response
            </button>
          )}

          <div>
            <Link
              to="/"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 active:scale-[0.98] dark:focus:ring-offset-slate-900"
            >
              <Home size={17} />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-[#0b0b10] sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-extrabold">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-600 text-white">
              <Sparkles size={17} />
            </span>
            Formly
          </span>

          <ThemeToggle />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <section
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#13131b]"
            style={{
              borderTop: `8px solid ${form.theme?.color || "#673ab7"}`,
            }}
          >
            <div className="p-6 sm:p-8">
              <h1 className="break-words text-2xl font-extrabold sm:text-3xl">
                {form.title}
              </h1>

              {form.description && (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {form.description}
                </p>
              )}

              <p className="mt-5 text-xs text-slate-400">
                Fields marked with * are required.
              </p>
            </div>
          </section>

          {form.settings?.collectEmail && (
            <section className="surface p-6">
              <label className="mb-3 block text-sm font-bold">
                Email address <span className="text-red-500">*</span>
              </label>

              <input
                type="email"
                required
                readOnly
                value={email}
                className="field"
                placeholder="you@example.com"
              />

              {form.settings?.limitOneResponse && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Repeat submissions using the same email address will be
                  rejected.
                </p>
              )}
            </section>
          )}

          {questions.map((question, index) => (
            <section key={question._id} className="surface p-6 sm:p-7">
              <label className="mb-2 block text-sm font-bold leading-6">
                {index + 1}. {question.title}
                {question.required && (
                  <span className="ml-1 text-red-500">*</span>
                )}
              </label>

              {question.description && (
                <p className="mb-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {question.description}
                </p>
              )}

              <div className="mt-4">{renderQuestion(question)}</div>
            </section>
          ))}

          <section className="surface space-y-4 p-6">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={sendCopy}
                onChange={(event) => setSendCopy(event.target.checked)}
                className="mt-1 h-4 w-4 accent-violet-600"
              />

              <span>
                <span className="block text-sm font-semibold">
                  Send me a copy of my responses
                </span>

                <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Receive a copy at your registered account email.
                </span>

                {sendCopy && user?.email && (
                  <span className="mt-2 block text-sm font-medium text-violet-600">
                    {user.email}
                  </span>
                )}

                {sendCopy && !user?.email && (
                  <span className="mt-2 block text-sm text-amber-600">
                    Log in to receive a copy by email.
                  </span>
                )}
              </span>
            </label>
          </section>

          <div className="flex items-center justify-between gap-3 py-3">
            <button
              type="button"
              onClick={() => {
                setAnswers({});
                setEmail(user?.email ?? "");
                setSendCopy(false);
              }}
              className="btn-secondary"
            >
              Clear answers
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <Send size={17} />
              )}
              {submitting ? "Submitting..." : "Submit response"}
            </button>
          </div>
        </form>

        <p className="py-6 text-center text-xs text-slate-400">
          Powered by Formly. Created by Saksham Rijal.
        </p>
      </div>
    </div>
  );
}
