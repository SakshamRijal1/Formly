
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Eye,
  GripVertical,
  ImagePlus,
  LoaderCircle,
  Plus,
  Save,
  Send,
  Settings2,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "../services/api";

const questionTypes = [
  ["short-answer", "Short answer"],
  ["paragraph", "Paragraph"],
  ["multiple-choice", "Multiple choice"],
  ["checkboxes", "Checkboxes"],
  ["dropdown", "Dropdown"],
  ["date", "Date"],
  ["time", "Time"],
  ["number", "Number"],
  ["rating", "Rating"],
  ["file-upload", "File upload"],
];

const palette = [
  "#673ab7",
  "#2563eb",
  "#0f766e",
  "#db2777",
  "#ea580c",
  "#334155",
];

const newQuestion = () => ({
  title: "",
  description: "",
  type: "short-answer",
  required: false,
  options: ["Option 1", "Option 2"],

  // Rating question settings
  ratingSettings: {
    scale: 5,
    icon: "star",
  },

  // File upload question settings
  // Only one file is allowed per question.
  fileUploadSettings: {
    maxFiles: 1,
    maxSizeMB: 5,
    allowedTypes: ["image/*", "application/pdf"],
  },

  // Question image
  imageUrl: "",
  imageFileId: "",
});

export default function FormBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState("questions");
   useEffect(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      })})

  useEffect(() => {
    let active = true;

    api
      .get(`/forms/${id}`)
      .then(({ data }) => {
        if (active) setForm(data.form);
      })
      .catch((error) => {
        toast.error(getErrorMessage(error));
        navigate("/", { replace: true });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, navigate]);

  const patchForm = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const updateQuestion = (index, patch) => {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, i) =>
        i === index ? { ...question, ...patch } : question
      ),
    }));
  };

  const addQuestion = () => {
    setForm((current) => ({
      ...current,
      questions: [...current.questions, newQuestion()],
    }));
  };

  const removeQuestion = (index) => {
    setForm((current) => ({
      ...current,
      questions: current.questions.filter((_, i) => i !== index),
    }));
  };

  const saveForm = async (showToast = true) => {
    setSaving(true);

    try {
      const { data } = await api.patch(`/forms/${id}`, {
        title: form.title,
        description: form.description,
        questions: form.questions,
        theme: form.theme,
        settings: form.settings,
      });

      setForm(data.form);

      if (showToast) {
        toast.success("All changes saved.");
      }

      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setPublishing(true);

    try {
      const saved = await saveForm(false);

      if (!saved) return;

      const { data } = await api.post(`/forms/${id}/publish`);

      setForm(data.form);

      try {
        await navigator.clipboard.writeText(data.publicUrl);
        toast.success("Published! Public link copied.");
      } catch {
        toast.success("Form published successfully.");
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setPublishing(false);
    }
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/forms/${id}`;

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Form link copied.");
    } catch {
      toast.error(
        "Couldn't copy automatically. Open the preview to copy the link."
      );
    }
  };

  /*
   * Upload image for a specific question.
   *
   * The question must already have an _id.
   * Therefore the form should be saved first before
   * uploading an image to a newly created question.
   */
  const uploadQuestionImage = async (index, file, inputElement) => {
    if (!file) return;

    if (!questionImageIsValid(file)) {
      if (inputElement) inputElement.value = "";
      return;
    }

    const question = form.questions[index];

    if (!question?._id) {
      toast.error("Save the form first, then upload the image.");

      if (inputElement) {
        inputElement.value = "";
      }

      return;
    }

    try {
      const body = new FormData();
      body.append("image", file);

      const { data } = await api.post(
        `/forms/${id}/questions/${question._id}/image`,
        body
      );

      const result = data?.data ?? data;

      updateQuestion(index, {
        imageUrl:
          result?.imageUrl ??
          result?.url ??
          result?.image?.url ??
          "",
        imageFileId:
          result?.imageFileId ??
          result?.fileId ??
          result?.image?.fileId ??
          "",
      });

      toast.success("Question image uploaded.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      if (inputElement) {
        inputElement.value = "";
      }
    }
  };

  const questionImageIsValid = (file) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB.");
      return false;
    }

    return true;
  };

  if (loading || !form) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoaderCircle
          className="animate-spin text-violet-600"
          size={30}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Header */}
      <header className="sticky top-[72px] z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0b0b10]/95 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        <div className="flex min-w-0 items-center gap-2">
          <button
            className="icon-btn"
            onClick={() => navigate("/")}
            title="Back to dashboard"
          >
            <ArrowLeft size={19} />
          </button>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold">
              {form.title || "Untitled form"}
            </p>

            <p className="text-xs text-slate-500">
              {saving
                ? "Saving..."
                : "Changes are saved when you click Save"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/builder/${id}/responses`}
            className="btn-secondary !px-3"
          >
            <Settings2 size={16} />
            Responses
          </Link>

          {form.isPublished && (
            <button onClick={copyLink} className="btn-secondary !px-3">
              <Copy size={16} />
            </button>
          )}

          <button
            onClick={() => saveForm()}
            disabled={saving}
            className="btn-secondary !px-3"
          >
            {saving ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save
          </button>

          <button
            onClick={publish}
            disabled={publishing}
            className="btn-primary !px-3"
          >
            {publishing ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}

            {form.isPublished ? "Update publish" : "Publish"}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center justify-center gap-2">
        {[
          ["questions", "Questions"],
          ["settings", "Settings"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
              activeTab === value
                ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
                : "text-slate-500 hover:bg-white dark:hover:bg-white/[0.05]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Form header */}
      <section
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft dark:border-white/[0.08] dark:bg-[#13131b]"
        style={{
          borderTop: `8px solid ${form.theme?.color || palette[0]}`,
        }}
      >
        <div className="p-5 sm:p-8">
          <input
            value={form.title}
            onChange={(e) => patchForm({ title: e.target.value })}
            placeholder="Untitled form"
            maxLength={200}
            className="w-full border-0 border-b-2 border-slate-200 bg-transparent pb-3 text-2xl font-extrabold tracking-tight outline-none transition focus:border-violet-500 dark:border-white/10 dark:focus:border-violet-400 sm:text-3xl"
          />

          <textarea
            value={form.description || ""}
            onChange={(e) => patchForm({ description: e.target.value })}
            placeholder="Add a description to tell people what this form is about..."
            rows={2}
            maxLength={5000}
            className="mt-4 w-full resize-y border-0 bg-transparent text-sm leading-6 text-slate-600 outline-none placeholder:text-slate-400 dark:text-slate-300"
          />
        </div>
      </section>

      {/* Questions */}
      {activeTab === "questions" ? (
        <div className="space-y-4">
          {form.questions.map((question, index) => {
            const hasOptions = [
              "multiple-choice",
              "checkboxes",
              "dropdown",
            ].includes(question.type);

            return (
              <article
                key={question._id || `new-${index}`}
                className="surface overflow-hidden"
              >
                {/* Question top bar */}
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <GripVertical size={16} />
                    QUESTION {index + 1}
                  </div>

                  <button
                    onClick={() => removeQuestion(index)}
                    className="icon-btn h-9 w-9 hover:text-red-500"
                    aria-label={`Delete question ${index + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="space-y-5 p-5 sm:p-6">
                  {/* Question title + type */}
                  <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                    <input
                      value={question.title}
                      onChange={(e) =>
                        updateQuestion(index, {
                          title: e.target.value,
                        })
                      }
                      placeholder="Write your question here"
                      maxLength={2000}
                      className="field"
                    />

                    <div className="relative">
                      <select
                        value={question.type}
                        onChange={(e) => {
                          const type = e.target.value;

                          updateQuestion(index, {
                            type,
                            options: [
                              "multiple-choice",
                              "checkboxes",
                              "dropdown",
                            ].includes(type)
                              ? question.options?.length
                                ? question.options
                                : ["Option 1", "Option 2"]
                              : [],
                          });
                        }}
                        className="field appearance-none pr-9 text-slate-900 dark:bg-slate-800 dark:text-white"
                      >
                        {questionTypes.map(([value, label]) => (
                          <option
                            key={value}
                            value={value}
                            className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white"
                          >
                            {label}
                          </option>
                        ))}
                      </select>

                      <ChevronDown
                        size={16}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <input
                    value={question.description || ""}
                    onChange={(e) =>
                      updateQuestion(index, {
                        description: e.target.value,
                      })
                    }
                    placeholder="Optional help text"
                    className="field"
                  />

                  {/* QUESTION IMAGE */}
                  <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        <ImagePlus size={17} />
                        Question image
                      </div>

                      <label className="btn-secondary cursor-pointer">
                        <ImagePlus size={16} />

                        {question.imageUrl
                          ? "Change image"
                          : "Add image"}

                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            uploadQuestionImage(
                              index,
                              e.target.files?.[0],
                              e.target
                            )
                          }
                        />
                      </label>
                    </div>

                    {question.imageUrl && (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-slate-900">
                        <img
                          src={question.imageUrl}
                          alt="Question"
                          className="max-h-72 max-w-full rounded-lg object-contain"
                        />
                      </div>
                    )}

                    {!question.imageUrl && (
                      <p className="mt-2 text-xs text-slate-500">
                        Add an image that respondents will see with this
                        question(if required).
                      </p>
                    )}
                  </div>

                  {/* Existing options */}
                  {hasOptions && (
                    <div className="space-y-3">
                      {question.options.map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className="flex items-center gap-3"
                        >
                          <span
                            className={`h-4 w-4 shrink-0 border border-slate-300 dark:border-slate-600 ${
                              question.type === "checkboxes"
                                ? "rounded"
                                : "rounded-full"
                            }`}
                          />

                          <input
                            value={option}
                            onChange={(e) => {
                              const options = [...question.options];

                              options[optionIndex] = e.target.value;

                              updateQuestion(index, {
                                options,
                              });
                            }}
                            maxLength={500}
                            placeholder={`Option ${optionIndex + 1}`}
                            className="field !py-2.5"
                          />

                          <button
                            onClick={() =>
                              updateQuestion(index, {
                                options: question.options.filter(
                                  (_, i) => i !== optionIndex
                                ),
                              })
                            }
                            className="icon-btn h-9 w-9 hover:text-red-500"
                            aria-label="Remove option"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}

                      {question.options.length < 100 && (
                        <button
                          onClick={() =>
                            updateQuestion(index, {
                              options: [
                                ...question.options,
                                `Option ${question.options.length + 1}`,
                              ],
                            })
                          }
                          className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600"
                        >
                          <Plus size={16} />
                          Add option
                        </button>
                      )}
                    </div>
                  )}

                  {/* Short answer / paragraph */}
                  {["short-answer", "paragraph"].includes(question.type) && (
                    <div className="max-w-lg border-b border-dashed border-slate-300 pb-2 text-sm text-slate-400 dark:border-slate-600">
                      {question.type === "short-answer"
                        ? "Short answer text"
                        : "Long answer text"}
                    </div>
                  )}

                  {/* Date */}
                  {question.type === "date" && (
                    <input
                      type="date"
                      disabled
                      className="field max-w-xs opacity-60"
                    />
                  )}

                  {/* Time */}
                  {question.type === "time" && (
                    <input
                      type="time"
                      disabled
                      className="field max-w-xs opacity-60"
                    />
                  )}

                  {/* Number */}
                  {question.type === "number" && (
                    <input
                      type="number"
                      disabled
                      placeholder="0"
                      className="field max-w-xs opacity-60"
                    />
                  )}

                  {/* RATING QUESTION */}
                  {question.type === "rating" && (
                    <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                      <div className="mb-4 flex items-center gap-2">
                        <Star size={18} />
                        <h4 className="font-semibold">
                          Rating settings
                        </h4>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-medium">
                          Rating scale

                          <select
                            className="field mt-2  bg-white text-slate-900 dark:bg-slate-800 dark:text-white"
                            value={
                              question.ratingSettings?.scale ?? 5
                            }
                            onChange={(e) =>
                              updateQuestion(index, {
                                ratingSettings: {
                                  ...(question.ratingSettings || {}),
                                  scale: Number(e.target.value),
                                },
                              })
                            }
                          >
                            <option value={5}>1 – 5</option>
                            <option value={10}>1 – 10</option>
                          </select>
                        </label>

                        <label className="text-sm font-medium">
                          Rating icon

                          <select
                            className="field mt-2 bg-white text-slate-900 dark:bg-slate-800 dark:text-white"
                            value={
                              question.ratingSettings?.icon ?? "star"
                            }
                            onChange={(e) =>
                              updateQuestion(index, {
                                ratingSettings: {
                                  ...(question.ratingSettings || {}),
                                  icon: e.target.value,
                                },
                              })
                            }
                          >
                            <option value="star">⭐ Stars</option>
                            <option value="heart">❤️ Hearts</option>
                            <option value="thumb">
                              👍 Thumbs up
                            </option>
                          </select>
                        </label>
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-white/10">
                        <p className="mb-2 text-xs font-semibold text-slate-500">
                          Preview
                        </p>

                        <div className="flex items-center gap-2">
                          {Array.from({
                            length:
                              question.ratingSettings?.scale ?? 5,
                          }).map((_, ratingIndex) => {
                            const icon =
                              question.ratingSettings?.icon ?? "star";

                            return (
                              <span
                                key={ratingIndex}
                                className="text-2xl text-slate-300"
                              >
                                {icon === "heart"
                                  ? "♡"
                                  : icon === "thumb"
                                  ? "👍"
                                  : "☆"}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FILE UPLOAD QUESTION */}
                  {question.type === "file-upload" && (
                    <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                      <div className="mb-4 flex items-center gap-2">
                        <Upload size={18} />
                        <h4 className="font-semibold">
                          File upload settings
                        </h4>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {/* Maximum files: fixed to one */}
                        <label className="text-sm font-medium">
                          Maximum files

                          <select
                            className="field mt-2 bg-white text-slate-900 dark:bg-slate-800 dark:text-white"
                            value={1}
                            disabled
                          >
                            <option value={1}>1 file</option>
                          </select>
                        </label>

                        {/* Maximum size */}
                        <label className="text-sm font-medium">
                          Maximum size

                          <select
                            className="field mt-2 bg-white text-slate-900 dark:bg-slate-800 dark:text-white"
                            value={
                              question.fileUploadSettings?.maxSizeMB ?? 5
                            }
                            onChange={(e) =>
                              updateQuestion(index, {
                                fileUploadSettings: {
                                  ...(question.fileUploadSettings || {}),
                                  maxFiles: 1,
                                  maxSizeMB: Number(e.target.value),
                                },
                              })
                            }
                          >
                            <option value={1}>1 MB</option>
                            <option value={5}>5 MB</option>
                            <option value={10}>10 MB</option>
                            <option value={20}>20 MB</option>
                          </select>
                        </label>
                      </div>

                      <div className="mt-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                        <p className="text-xs leading-5 text-slate-500">
                          Respondents can upload one image or PDF file.
                          Maximum 1 file and{" "}
                          {question.fileUploadSettings?.maxSizeMB ?? 5} MB
                          per file.
                        </p>
                      </div>

                      {/* Builder preview */}
                      <div className="mt-4 flex max-w-lg items-center gap-3 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-600">
                        <Upload
                          size={22}
                          className="text-slate-400"
                        />

                        <div>
                          <p className="text-sm font-semibold">
                            Upload file
                          </p>

                          <p className="text-xs text-slate-500">
                            Images or PDF
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Required */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/[0.06]">
                    <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={Boolean(question.required)}
                        onChange={(e) =>
                          updateQuestion(index, {
                            required: e.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-violet-600"
                      />

                      Required question
                    </label>

                    {question.required && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <Check size={14} />
                        Required
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {/* Add question */}
          <button
            onClick={addQuestion}
            className="surface flex w-full items-center justify-center gap-2 border-dashed p-5 text-sm font-bold text-violet-600 transition hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-500/[0.04]"
          >
            <Plus size={18} />
            Add question
          </button>
        </div>
      ) : (
        /* SETTINGS */
        <section className="surface space-y-6 p-5 sm:p-7">
          {/* Theme */}
          <div>
            <h3 className="font-bold">Theme color</h3>

            <p className="mt-1 text-sm text-slate-500">
              Choose an accent color for your form.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              {palette.map((color) => (
                <button
                  key={color}
                  onClick={() =>
                    patchForm({
                      theme: {
                        ...form.theme,
                        color,
                      },
                    })
                  }
                  className={`grid h-10 w-10 place-items-center rounded-full transition ${
                    form.theme?.color === color
                      ? "ring-2 ring-offset-2 ring-violet-500 dark:ring-offset-[#13131b]"
                      : ""
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Set theme ${color}`}
                >
                  {form.theme?.color === color && (
                    <Check size={18} className="text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Response settings */}
          <div className="border-t border-slate-100 pt-5 dark:border-white/[0.07]">
            <h3 className="font-bold">Response settings</h3>

            <div className="mt-4 space-y-4">
              {[
                [
                  "collectEmail",
                  "Collect email addresses",
                  "Require respondents to enter an email.",
                ],
                [
                  "shuffleQuestions",
                  "Shuffle questions",
                  "Show questions in a different order.",
                ],
                [
                  "limitOneResponse",
                  "Limit to one response",
                  "Restrict repeat submissions.",
                ],
              ].map(([key, title, description]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 p-4 dark:border-white/10"
                >
                  <span>
                    <span className="block text-sm font-semibold">
                      {title}
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {description}
                    </span>
                  </span>

                  <input
                    type="checkbox"
                    checked={Boolean(form.settings?.[key])}
                    onChange={(e) =>
                      patchForm({
                        settings: {
                          ...form.settings,
                          [key]: e.target.checked,
                        },
                      })
                    }
                    className="mt-1 h-4 w-4 accent-violet-600"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Confirmation message */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">
              Confirmation message
            </label>

            <textarea
              value={form.settings?.confirmationMessage ?? ""}
              onChange={(e) =>
                patchForm({
                  settings: {
                    ...form.settings,
                    confirmationMessage: e.target.value,
                  },
                })
              }
              maxLength={1000}
              rows={4}
              placeholder="Thank you! Your response has been recorded."
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-900"
            />

            <p className="text-xs text-slate-500">
              This message appears after a respondent submits the form.
            </p>
          </div>
        </section>
      )}

      {/* Bottom buttons */}
      <div className="flex flex-wrap justify-between gap-3 pb-6">
        <button onClick={addQuestion} className="btn-secondary">
          <Plus size={17} />
          Add question
        </button>

        <button
          onClick={() => saveForm()}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? (
            <LoaderCircle className="animate-spin" size={17} />
          ) : (
            <Save size={17} />
          )}
          Save changes
        </button>
      </div>
    </div>
  );
}
