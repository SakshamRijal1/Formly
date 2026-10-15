
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle2,
  FileText,
  Home,
  LoaderCircle,
  Send,
  Sparkles,
  Star,
  Heart,
  ThumbsUp,
  Upload,
  Image as ImageIcon,
  X,
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

  // Added: track uploads separately for each question.
  const [uploading, setUploading] = useState({});

  // Warn users before refreshing or closing the page.
  useEffect(() => {
    const hasUnsavedData = () => {
      const hasAnswers = Object.values(answers).some((answer) => {
        if (Array.isArray(answer)) return answer.length > 0;

        if (answer && typeof answer === "object") {
          return (
            Boolean(answer.assetIds?.length) ||
            Boolean(answer.files?.length)
          );
        }

        return String(answer ?? "").trim() !== "";
      });

      return (
        hasAnswers ||
        Boolean(email.trim()) ||
        sendCopy
      );
    };

    const handleBeforeUnload = (event) => {
      if (!hasUnsavedData() || submitted) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
    };
  }, [answers, email, sendCopy, submitted]);

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
    setUploading({});

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

  // Added: upload selected files through the existing backend route.
  const uploadQuestionFiles = async (question, fileList) => {
    const selectedFiles = Array.from(fileList ?? []);

    if (!selectedFiles.length) return;

    const questionId = question._id;
    const settings = question.fileUploadSettings ?? {};

    const maxFiles = Math.max(
      1,
      Math.min(10, Number(settings.maxFiles) || 1)
    );

    const maxSizeMB = Math.max(
      1,
      Math.min(20, Number(settings.maxSizeMB) || 10)
    );

    const isImageQuestion = question.type === "image-upload";

    const allowedTypes = isImageQuestion
      ? ["image/*"]
      : Array.isArray(settings.allowedTypes) &&
          settings.allowedTypes.length
        ? settings.allowedTypes
        : ["image/*", "application/pdf"];

    const currentAnswer = answers[questionId];
    const existingFiles = Array.isArray(currentAnswer?.files)
      ? currentAnswer.files
      : [];

    if (existingFiles.length + selectedFiles.length > maxFiles) {
      toast.error(
        `You can upload a maximum of ${maxFiles} file(s).`
      );
      return;
    }

    const matchesAllowedType = (file, pattern) => {
      if (pattern === "*/*") return true;

      if (pattern.endsWith("/*")) {
        return file.type.startsWith(pattern.slice(0, -1));
      }

      return (
        file.type === pattern ||
        file.name.toLowerCase().endsWith(pattern.toLowerCase())
      );
    };

    for (const file of selectedFiles) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(
          `${file.name} exceeds the ${maxSizeMB} MB file-size limit.`
        );
        return;
      }

      if (
        !allowedTypes.some((type) => matchesAllowedType(file, type))
      ) {
        toast.error(
          `${file.name} is not an allowed file type.`
        );
        return;
      }
    }

    setUploading((current) => ({
      ...current,
      [questionId]: true,
    }));

    try {
      const body = new FormData();

      selectedFiles.forEach((file) => {
        body.append("files", file);
      });

      const { data } = await api.post(
        `/responses/${id}/upload/${questionId}`,
        body
      );

      const uploadedFiles = Array.isArray(data.files)
        ? data.files
        : [];

      if (
        uploadedFiles.length !== selectedFiles.length ||
        uploadedFiles.some((file) => !file.assetId)
      ) {
        throw new Error(
          "The server did not return all uploaded file IDs."
        );
      }

      setAnswers((current) => {
        const previous = current[questionId];
        const previousFiles = Array.isArray(previous?.files)
          ? previous.files
          : [];

        const allFiles = [...previousFiles, ...uploadedFiles];

        return {
          ...current,
          [questionId]: {
            assetIds: allFiles.map((file) => file.assetId),
            files: allFiles,
          },
        };
      });

      toast.success(
        isImageQuestion
          ? "Image uploaded successfully."
          : "File uploaded successfully."
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUploading((current) => ({
        ...current,
        [questionId]: false,
      }));
    }
  };

  // Added: remove an uploaded file from the pending response.
  // This does not delete the stored file from the server.
  const removeUploadedFile = (questionId, assetId) => {
    setAnswers((current) => {
      const answer = current[questionId];
      const files = (answer?.files ?? []).filter(
        (file) => file.assetId !== assetId
      );

      return {
        ...current,
        [questionId]: {
          assetIds: files.map((file) => file.assetId),
          files,
        },
      };
    });
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

    // Added: prevent submission while any upload is still running.
    if (Object.values(uploading).some(Boolean)) {
      toast.error("Please wait for your uploads to finish.");
      return;
    }

    // Added: validate required ratings and uploads.
    for (const question of questions) {
      const value = answers[question._id];

      if (!question.required) continue;

      if (
        question.type === "rating" &&
        !(Number(value) > 0)
      ) {
        toast.error(`Please rate: ${question.title}`);
        return;
      }

      if (
        question.type === "file-upload" ||
        question.type === "image-upload"
      ) {
        if (!value?.assetIds?.length) {
          toast.error(
            `Please upload a file for: ${question.title}`
          );
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        answers: questions.map((question) => {
          const value = answers[question._id] ?? "";

          // Include assetIds at the answer level and inside value
          // to accommodate the existing response controller's
          // asset-ID handling.
          if (
            question.type === "file-upload" ||
            question.type === "image-upload"
          ) {
            const assetIds = value?.assetIds ?? [];

            return {
              questionId: question._id,
              assetIds,
              value: { assetIds },
            };
          }

          // Ratings must be submitted as numbers.
          if (question.type === "rating") {
            return {
              questionId: question._id,
              value: value === "" ? "" : Number(value),
            };
          }

          return {
            questionId: question._id,
            value,
          };
        }),

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
        className="bg-white field text-slate-900 dark:bg-slate-800 dark:text-white"
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

    // Added: star, heart, or thumbs-up rating question.
    if (question.type === "rating") {
      const settings = question.ratingSettings ?? {};
      const scale = Number(settings.scale) === 10 ? 10 : 5;

      const rating = Number(value) || 0;

      const RatingIcon =
        settings.icon === "heart"
          ? Heart
          : settings.icon === "thumb"
            ? ThumbsUp
            : Star;

      return (
        <div className="space-y-3">
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label={`Rate ${question.title}`}
          >
            {Array.from({ length: scale }, (_, index) => {
              const score = index + 1;
              const selected = score <= rating;

              return (
                <button
                  key={score}
                  type="button"
                  disabled={submitting}
                  aria-label={`${score} out of ${scale}`}
                  aria-pressed={rating === score}
                  onClick={() => updateAnswer(question._id, score)}
                  className={`grid h-11 w-11 place-items-center rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                    selected
                      ? "border-violet-500 bg-violet-50 text-violet-600 dark:bg-violet-500/15"
                      : "border-slate-200 text-slate-400 hover:border-violet-300 hover:text-violet-500 dark:border-white/10"
                  }`}
                >
                  <RatingIcon
                    size={21}
                    fill={
                      selected && settings.icon !== "thumb"
                        ? "currentColor"
                        : "none"
                    }
                  />
                </button>
              );
            })}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {rating
              ? `Your rating: ${rating} out of ${scale}`
              : `Choose a rating from 1 to ${scale}.`}
          </p>
        </div>
      );
    }

    // Added: actual file and image uploads.
    if (
      question.type === "file-upload" ||
      question.type === "image-upload"
    ) {
      const settings = question.fileUploadSettings ?? {};

      const isImageQuestion = question.type === "image-upload";

      const maxFiles = Math.max(
        1,
        Math.min(10, Number(settings.maxFiles) || 1)
      );

      const maxSizeMB = Math.max(
        1,
        Math.min(20, Number(settings.maxSizeMB) || 10)
      );

      const uploadedFiles = Array.isArray(value?.files)
        ? value.files
        : [];

      const isUploading = Boolean(uploading[question._id]);

      const accept = isImageQuestion
        ? "image/*"
        : Array.isArray(settings.allowedTypes) &&
            settings.allowedTypes.length
          ? settings.allowedTypes.join(",")
          : "image/*,application/pdf";

      const remainingFiles = maxFiles - uploadedFiles.length;

      return (
        <div className="space-y-4">
          <label
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
              isUploading || remainingFiles <= 0
                ? "cursor-not-allowed opacity-60"
                : "border-slate-300 hover:border-violet-400 hover:bg-violet-50/50 dark:border-white/15 dark:hover:bg-violet-500/5"
            }`}
          >
            {isUploading ? (
              <LoaderCircle
                size={30}
                className="animate-spin text-violet-600"
              />
            ) : isImageQuestion ? (
              <ImageIcon size={30} className="text-violet-600" />
            ) : (
              <Upload size={30} className="text-violet-600" />
            )}

            <span className="mt-3 text-sm font-semibold">
              {isUploading
                ? "Uploading..."
                : isImageQuestion
                  ? "Choose image(s)"
                  : "Choose file(s)"}
            </span>

            <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {isImageQuestion
                ? "Image files only"
                : "Select the requested file(s)"}
              {" · "}
              Up to {maxSizeMB} MB each
            </span>

            <input
              type="file"
              accept={accept}
              multiple={maxFiles > 1}
              disabled={
                isUploading ||
                submitting ||
                remainingFiles <= 0
              }
              required={
                Boolean(question.required) &&
                uploadedFiles.length === 0
              }
              onChange={(event) => {
                const input = event.target;
                const files = input.files;

                // Reset so the same file can be selected again.
                void uploadQuestionFiles(question, files);
                input.value = "";
              }}
              className="sr-only"
            />
          </label>

          {remainingFiles <= 0 && (
            <p className="text-xs text-slate-500">
              Maximum number of files reached.
            </p>
          )}

          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div
                  key={file.assetId}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-white/10"
                >
                  {isImageQuestion ? (
                    <ImageIcon
                      size={20}
                      className="shrink-0 text-violet-600"
                    />
                  ) : (
                    <FileText
                      size={20}
                      className="shrink-0 text-violet-600"
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium">
                      {file.name}
                    </p>

                    {Number.isFinite(Number(file.size)) && (
                      <p className="text-xs text-slate-500">
                        {(Number(file.size) / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    )}
                  </div>

                  <CheckCircle2
                    size={18}
                    className="shrink-0 text-emerald-500"
                  />

                  <button
                    type="button"
                    disabled={submitting || isUploading}
                    onClick={() =>
                      removeUploadedFile(
                        question._id,
                        file.assetId
                      )
                    }
                    aria-label={`Remove ${file.name}`}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-500/10"
                  >
                    <X size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    const typeMap = {
      date: "date",
      time: "time",
      number: "number",
      "short-answer": "text",
    };

    return (
      <input
        {...common}
        type={typeMap[question.type] || "text"}
        value={value}
        onChange={(event) =>
          updateAnswer(question._id, event.target.value)
        }
        placeholder="Your answer"
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
              disabled={
                submitting ||
                Object.values(uploading).some(Boolean)
              }
              className="btn-primary"
            >
              {submitting ||
              Object.values(uploading).some(Boolean) ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <Send size={17} />
              )}
              {Object.values(uploading).some(Boolean)
                ? "Uploading..."
                : submitting
                  ? "Submitting..."
                  : "Submit response"}
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
