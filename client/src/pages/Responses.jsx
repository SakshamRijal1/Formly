
import { useCallback, useEffect, useState } from "react";

import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  LoaderCircle,
  MessageSquareText,
  Volume2,
  VolumeX,
} from "lucide-react";

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
// If only asset IDs were saved, show the IDs safely instead.

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

  // Handle files whose metadata and URL were saved.
  if (files.length > 0) {
    return (
      <div className="space-y-3">
        {files.map((file, index) => {
          const isString = typeof file === "string";
          const name = isString
            ? `Uploaded file ${index + 1}`
            : file?.name || file?.originalName || `Uploaded file ${index + 1}`;

          const assetId = isString ? "" : file?.assetId;

          // Prefer the protected backend route when an asset ID exists.
          const href = assetId && formId
            ? `${api.defaults.baseURL}/responses/${encodeURIComponent(formId)}/files/${encodeURIComponent(assetId)}`
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

  // Handle the assetIds format used by your current responses.
  return (
    <div className="space-y-3">
      {assetIds.map((assetId, index) => (
        <a
          key={`${assetId}-${index}`}
          href={`${api.defaults.baseURL}/responses/${encodeURIComponent(formId)}/files/${encodeURIComponent(assetId)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 break-all font-semibold text-violet-600 hover:underline dark:text-violet-300"
        >
          <Download size={16} />
          View / download PDF {index + 1}
        </a>
      ))}
    </div>
  );
}


export default function Responses() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

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

  const loadResponses = useCallback(async () => {
    const { data } = await api.get(`/responses/${id}`);
    setResponses(data.responses || []);
  }, [id]);
   useEffect(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      })},[])

  useEffect(() => {
    if (!id) return;

    const handleNewResponse = (event) => {
      if (String(event?.formId) !== String(id)) return;

      // Avoid duplicate entries if an event is delivered more than once.
      setResponses((current) => {
        if (
          current.some(
            (response) =>
              String(response._id) === String(event.responseId)
          )
        ) {
          return current;
        }

        // Fetch the full response from the existing API.
        loadResponses().catch((error) => {
          toast.error(getErrorMessage(error));
        });

        return current;
      });
    };

    socket.on("response:new", handleNewResponse);

    return () => {
      socket.off("response:new", handleNewResponse);
    };
  }, [id, loadResponses]);

  useEffect(() => {
    let active = true;

    setLoading(true);

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
        if (active) toast.error(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const downloadCSV = () => {
    const questions = form?.questions || [];

    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = [
      ["Submitted at", "Email", ...questions.map((q) => q.title)],
      ...responses.map((response) => {
        const answerMap = new Map(
          response.answers.map((answer) => [
            String(answer.questionId),
            answer.value,
          ])
        );

        return [
          new Date(response.createdAt).toISOString(),
          response.respondentEmail || "",
          ...questions.map((question) => {
            const value = answerMap.get(String(question._id));

            // Export uploaded asset IDs without causing an object error.
            if (
              value &&
              typeof value === "object" &&
              Array.isArray(value.assetIds)
            ) {
              return value.assetIds.join(", ");
            }

            // Also support saved file metadata if present.
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
              return value.join(", ");
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

    link.click();
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
            type="button"
            onClick={() => setSoundEnabled((enabled) => !enabled)}
            className="btn-secondary"
            title={
              soundEnabled
                ? "Mute notification sound"
                : "Enable notification sound"
            }
          >
            {soundEnabled ? (
              <Volume2 size={17} />
            ) : (
              <VolumeX size={17} />
            )}
            {soundEnabled ? "Sound on" : "Sound off"}
          </button>

          <button
            onClick={downloadCSV}
            disabled={!responses.length}
            className="btn-primary"
          >
            <Download size={17} />
            Export CSV
          </button>
        </div>
      </div>

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
                  {new Date(response.createdAt).toLocaleString()}
                </time>
              </div>

              <div className="space-y-4">
                {form.questions.map((question) => {
                  const answer = response.answers.find(
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
                  <UploadedFiles value={answer?.value} formId={id} />
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
