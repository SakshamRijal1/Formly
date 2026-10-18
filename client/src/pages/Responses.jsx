
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  LoaderCircle,
  MessageSquareText,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import toast from "react-hot-toast";
import { api, getErrorMessage } from "../services/api";
import { socket } from "../services/socket";

// Safely format answers without attempting to render JavaScript objects.
function getAnswerValue(value) {
  if (value === null || value === undefined || value === "") {
    return "No answer";
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "No answer";
  }

  if (typeof value === "object") {
    if (Array.isArray(value.assetIds)) {
      return value.assetIds.length
        ? value.assetIds.join(", ")
        : "No answer";
    }

    return JSON.stringify(value);
  }

  return String(value);
}

// Display uploaded files and images when their URLs are available.
// If only asset IDs were saved, show protected download links.
function UploadedFiles({ value, formId }) {
  const files = Array.isArray(value)
    ? value
    : Array.isArray(value?.files)
      ? value.files
      : [];

  const assetIds = Array.isArray(value?.assetIds)
    ? value.assetIds
    : [];

  if (!files.length && !assetIds.length) {
    return <span>No answer</span>;
  }

  if (files.length > 0) {
    return (
      <div className="space-y-3">
        {files.map((file, index) => {
          const isString = typeof file === "string";

          const name = isString
            ? `Uploaded file ${index + 1}`
            : file?.name ||
              file?.originalName ||
              `Uploaded file ${index + 1}`;

          const assetId = isString ? "" : file?.assetId;

          const href =
            assetId && formId
              ? `${api.defaults.baseURL}/responses/${encodeURIComponent(
                  formId
                )}/files/${encodeURIComponent(assetId)}`
              : isString
                ? file
                : file?.url;

          if (!href) {
            return <p key={index}>{name}</p>;
          }

          return (
            <a
              key={assetId || href || index}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 break-all font-semibold text-violet-600 hover:underline dark:text-violet-300"
            >
              <Download size={16} />
              {name}
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assetIds.map((assetId, index) => (
        <a
          key={`${assetId}-${index}`}
          href={`${api.defaults.baseURL}/responses/${encodeURIComponent(
            formId
          )}/files/${encodeURIComponent(assetId)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 break-all font-semibold text-violet-600 hover:underline dark:text-violet-300"
        >
          <Download size={16} />
          View / download file {index + 1}
        </a>
      ))}
    </div>
  );
}

// Question types that have meaningful selectable labels or rating values.
const CHARTABLE_TYPES = new Set([
  "multiple-choice",
  "single-choice",
  "multiplechoice",
  "singlechoice",
  "checkboxes",
  "checkbox",
  "dropdown",
  "select",
  "radio",
  "rating",
  "yes-no",
  "yesno",
]);

// Normalize saved answers so analytics can count selected labels.
function getAnalyticsLabels(value) {
  if (value === null || value === undefined || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => getAnalyticsLabels(item));
  }

  if (typeof value === "object") {
    return [];
  }

  const label = String(value).trim();
  return label ? [label] : [];
}

// Calculate response statistics for an individual question.
function getQuestionAnalytics(question, responses) {
  const type = String(question.type || "")
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

  if (!CHARTABLE_TYPES.has(type)) {
    return null;
  }

  const counts = new Map();
  let answeredCount = 0;

  responses.forEach((response) => {
    const answer = response.answers?.find(
      (item) =>
        String(item.questionId) === String(question._id)
    );

    const labels = getAnalyticsLabels(answer?.value);

    if (!labels.length) return;

    answeredCount += 1;

    labels.forEach((label) => {
      counts.set(label, (counts.get(label) || 0) + 1);
    });
  });

  const data = [...counts.entries()]
    .map(([label, count]) => ({
      label,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 10);

  return {
    questionId: question._id,
    title: question.title || "Untitled question",
    data,
    answeredCount,
    totalSelections: [...counts.values()].reduce(
      (total, count) => total + count,
      0
    ),
    highest: data[0] || null,
  };
}

// Reusable chart card for each supported question.
function AnalyticsCard({ item }) {
  const highestPercentage =
    item.totalSelections > 0
      ? Math.round(
          (item.highest.count / item.totalSelections) * 100
        )
      : 0;

  return (
    <article className="surface min-w-0 p-5 sm:p-6">
      <div className="mb-5">
        <div className="flex items-center gap-2 text-violet-600 dark:text-violet-300">
          <BarChart3 size={17} />
          <span className="text-xs font-bold uppercase tracking-wider">
            Question analytics
          </span>
        </div>

        <h3 className="mt-3 break-words text-base font-bold">
          {item.title}
        </h3>

        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {item.answeredCount}{" "}
          {item.answeredCount === 1
            ? "respondent answered"
            : "respondents answered"}
        </p>
      </div>

      {item.highest && (
        <div className="mb-5 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-400/20 dark:bg-violet-500/10">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Most selected answer
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <span className="break-words font-bold text-violet-700 dark:text-violet-300">
              {item.highest.label}
            </span>

            <span className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-sm font-extrabold text-violet-700 dark:bg-slate-900 dark:text-violet-300">
              {item.highest.count}{" "}
              {item.highest.count === 1
                ? "selection"
                : "selections"}
            </span>
          </div>

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {highestPercentage}% of all recorded selections
          </p>
        </div>
      )}

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={item.data}
            margin={{
              top: 8,
              right: 12,
              left: -12,
              bottom: 45,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="currentColor"
              opacity={0.12}
            />

            <XAxis
              dataKey="label"
              interval={0}
              angle={-30}
              textAnchor="end"
              height={75}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) =>
                String(value).length > 16
                  ? `${String(value).slice(0, 16)}…`
                  : value
              }
            />

            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12 }}
            />

            <Tooltip
              cursor={{ fill: "#8b5cf6", opacity: 0.08 }}
              formatter={(value) => [value, "Selections"]}
              labelFormatter={(label) => `Answer: ${label}`}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #ddd6fe",
                fontSize: 12,
              }}
            />

            <Bar
              dataKey="count"
              name="Selections"
              fill="#8b5cf6"
              radius={[6, 6, 0, 0]}
              maxBarSize={52}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {item.data.length === 10 && (
        <p className="mt-2 text-xs text-slate-500">
          Showing up to 10 labels, ordered by selection count.
        </p>
      )}
    </article>
  );
}

export default function Responses() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load the latest saved responses.
  const loadResponses = useCallback(async () => {
    const { data } = await api.get(`/responses/${id}`);
    setResponses(data.responses || []);
  }, [id]);

  // Keep the original Socket.IO diagnostics.
  useEffect(() => {
    console.log("Socket connected:", socket.connected);

    const onConnect = () => {
      console.log("Socket connected successfully:", socket.id);
    };

    const onConnectError = (error) => {
      console.error("Socket connection error:", error.message);
    };

    const handleNewResponse = (event) => {
      console.log("New response event received:", event);
    };

    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("response:new", handleNewResponse);

    return () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("response:new", handleNewResponse);
    };
  }, []);

  // Scroll to the top when the page mounts.
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, []);

  // Update response cards and analytics when a new response arrives.
  useEffect(() => {
    if (!id) return;

    let active = true;
    let refreshTimer;

    const handleNewResponse = (event) => {
      if (String(event?.formId) !== String(id)) return;

      // Prevent unnecessary repeated refreshes for the same event.
      setResponses((current) => {
        if (
          current.some(
            (response) =>
              String(response._id) === String(event.responseId)
          )
        ) {
          return current;
        }

        return current;
      });

      // Fetch complete response records from the existing API.
      // This also refreshes the charts using the saved answer data.
      clearTimeout(refreshTimer);

      refreshTimer = setTimeout(() => {
        if (active) {
          loadResponses().catch((error) => {
            toast.error(getErrorMessage(error));
          });
        }
      }, 150);
    };

    socket.on("response:new", handleNewResponse);

    return () => {
      active = false;
      clearTimeout(refreshTimer);
      socket.off("response:new", handleNewResponse);
    };
  }, [id, loadResponses]);

  // Load the form and its existing responses.
  useEffect(() => {
    let active = true;

    setLoading(true);
    setForm(null);

    Promise.all([
      api.get(`/forms/${id}`),
      api.get(`/responses/${id}`),
    ])
      .then(([formResult, responseResult]) => {
        if (!active) return;

        setForm(formResult.data.form);
        setResponses(responseResult.data.responses || []);
      })
      .catch((error) => {
        if (active) {
          toast.error(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  // Automatically calculate charts from the current responses.
  const analytics = useMemo(() => {
    return (form?.questions || [])
      .map((question) =>
        getQuestionAnalytics(question, responses)
      )
      .filter((item) => item && item.data.length > 0);
  }, [form, responses]);

  // Export all response records to CSV.
  const downloadCSV = () => {
    const questions = form?.questions || [];

    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = [
      ["Submitted at", "Email", ...questions.map((q) => q.title)],
      ...responses.map((response) => {
        const answerMap = new Map(
          (response.answers || []).map((answer) => [
            String(answer.questionId),
            answer.value,
          ])
        );

        return [
          response.createdAt
            ? new Date(response.createdAt).toISOString()
            : "",
          response.respondentEmail || "",
          ...questions.map((question) => {
            const value = answerMap.get(String(question._id));

            if (
              value &&
              typeof value === "object" &&
              Array.isArray(value.assetIds)
            ) {
              return value.assetIds.join(", ");
            }

            if (
              value &&
              typeof value === "object" &&
              Array.isArray(value.files)
            ) {
              return value.files
                .map((file) =>
                  typeof file === "string"
                    ? file
                    : file?.url || file?.name || file?.assetId || ""
                )
                .filter(Boolean)
                .join(", ");
            }

            if (Array.isArray(value)) {
              return value
                .map((item) =>
                  item && typeof item === "object"
                    ? JSON.stringify(item)
                    : String(item)
                )
                .join(", ");
            }

            if (value && typeof value === "object") {
              return JSON.stringify(value);
            }

            return value ?? "";
          }),
        ];
      }),
    ];

    const csv = rows
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${(
      form?.title || "form"
    ).replace(/[^a-z0-9-_]/gi, "_")}-responses.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <LoaderCircle
          size={30}
          className="animate-spin text-violet-600"
        />
      </div>
    );
  }

  if (!form) {
    return (
      <p className="text-sm text-slate-500">
        Unable to load this form.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page heading and actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to={`/builder/${id}`}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-violet-600"
          >
            <ArrowLeft size={16} />
            Back to editor
          </Link>

          <h1 className="text-2xl font-extrabold tracking-tight">
            Responses
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {form.title} · {responses.length}{" "}
            {responses.length === 1 ? "response" : "responses"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={downloadCSV}
            disabled={!responses.length}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={17} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Original total responses summary */}
      <div className="surface p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
            <MessageSquareText size={22} />
          </div>

          <div>
            <p className="text-2xl font-extrabold">
              {responses.length}
            </p>

            <p className="text-sm text-slate-500">
              Total submissions · Live updates
            </p>
          </div>
        </div>
      </div>

      {/* New response analytics section */}
      <section className="space-y-5">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">
            Response Analytics
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            See which answers respondents select most frequently.
          </p>
        </div>

        {analytics.length === 0 ? (
          <div className="surface p-6 text-center">
            <BarChart3
              size={30}
              className="mx-auto text-slate-400"
            />

            <h3 className="mt-3 font-bold">
              No chart data available yet
            </h3>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Charts appear for supported choice and rating
              questions after respondents submit answers.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {analytics.map((item) => (
              <AnalyticsCard
                key={String(item.questionId)}
                item={item}
              />
            ))}
          </div>
        )}
      </section>

      {/* Original response list */}
      {!responses.length ? (
        <div className="surface px-6 py-14 text-center">
          <MessageSquareText
            size={32}
            className="mx-auto text-slate-400"
          />

          <h2 className="mt-4 text-lg font-bold">
            No responses yet
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Publish your form and share the public link to collect
            responses.
          </p>

          <Link
            to={`/builder/${id}`}
            className="btn-primary mt-5"
          >
            Open form editor
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold tracking-tight">
            Individual Responses
          </h2>

          {responses.map((response) => (
            <article
              key={response._id}
              className="surface p-5 sm:p-6"
            >
              <div className="mb-4 flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-4 dark:border-white/[0.07]">
                <span className="text-sm font-bold">
                  {response.respondentEmail ||
                    "Anonymous respondent"}
                </span>

                <time className="text-xs text-slate-400">
                  {response.createdAt
                    ? new Date(response.createdAt).toLocaleString()
                    : "Date unavailable"}
                </time>
              </div>

              <div className="space-y-4">
                {(form.questions || []).map((question) => {
                  const answer = (response.answers || []).find(
                    (item) =>
                      String(item.questionId) ===
                      String(question._id)
                  );

                  return (
                    <div key={question._id}>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {question.title}
                      </p>

                      <div className="mt-1 break-words text-sm">
                        {[
                          "file-upload",
                          "image-upload",
                        ].includes(question.type) ? (
                          <UploadedFiles
                            value={answer?.value}
                            formId={id}
                          />
                        ) : question.type === "rating" ? (
                          <span>
                            {answer?.value !== null &&
                            answer?.value !== undefined
                              ? `${getAnswerValue(answer.value)} / ${
                                  question.ratingSettings?.scale || 5
                                }`
                              : "No answer"}
                          </span>
                        ) : (
                          <p className="whitespace-pre-wrap">
                            {getAnswerValue(answer?.value)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
