
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Trash2,
  ShieldAlert,
  LockKeyhole,
  LoaderCircle,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";

export default function DeleteAccountSection({
  authProvider = "local",
}) {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  const isGoogleAccount = authProvider === "google";
  const isConfirmed = confirmText === "DELETE";

const handleDelete = async (event) => {
  event.preventDefault();

  if (!isConfirmed) {
    toast.error('Please type "DELETE" to confirm.');
    return;
  }

  const confirmed = window.confirm(
    "Are you sure you want to permanently delete your Formly account and associated data? This cannot be undone."
  );

  if (!confirmed) return;

  setLoading(true);

  try {
    await api.delete("/users/me", {
      data: {
        password: password || undefined,
        confirmText,
      },
    });

    toast.success("Your account has been permanently deleted.");

    // Redirect to the login page after successful deletion.
    window.location.replace("/login");
  } catch (error) {
    toast.error(
      error.response?.data?.message ||
        "Unable to delete your account. Please try again."
    );
  } finally {
    setLoading(false);
  }
};


  return (
    <section className="w-full max-w-3xl overflow-hidden rounded-2xl border border-red-200/80 bg-white shadow-sm dark:border-red-900/60 dark:bg-slate-900">
      {/* Header */}
      <div className="border-b border-red-100 bg-gradient-to-r from-red-50 via-white to-white px-5 py-6 sm:px-7 dark:border-red-950 dark:from-red-950/30 dark:via-slate-900 dark:to-slate-900">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-200 bg-red-100 text-red-600 dark:border-red-900 dark:bg-red-950/70 dark:text-red-400">
            <ShieldAlert size={25} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                Delete account
              </h2>

            
            </div>

            <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
              Permanently remove your Formly account and its
              associated data.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-7">
        {/* Warning */}
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
          <AlertTriangle
            size={19}
            className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
          />

          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-300">
              This action is permanent
            </h3>

            <p className="text-sm leading-6 text-amber-800 dark:text-amber-200/80">
              Deleting your account may permanently remove your
              profile, owned forms, and responses associated with
              those forms. You will not be able to recover this
              data through your account.
            </p>
          </div>
        </div>

        {/* Data removal summary */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            What will be affected?
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="rounded-lg bg-slate-200/70 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Trash2 size={17} />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Your account and forms
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Your profile and forms you own.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="rounded-lg bg-slate-200/70 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <ShieldAlert size={17} />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Related responses
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Responses associated with your owned forms.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation form */}
        <form onSubmit={handleDelete} className="space-y-5">
          <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Confirm account deletion
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Complete the confirmation below to continue.
            </p>
          </div>

          {/* Password */}
          {!isGoogleAccount && (
            <div className="space-y-2">
              <label
                htmlFor="delete-account-password"
                className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                <LockKeyhole
                  size={15}
                  className="text-slate-400"
                />
                Current password
              </label>

              <input
                id="delete-account-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={loading}
                placeholder="Enter your current password"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-slate-600 dark:focus:border-red-500"
              />

              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                Verify your identity using your current password.
              </p>
            </div>
          )}

          {/* Type DELETE */}
          <div className="space-y-2">
            <label
              htmlFor="delete-account-confirm"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Type{" "}
              <span className="font-bold tracking-wide text-red-600 dark:text-red-400">
                DELETE
              </span>{" "}
              to confirm
            </label>

            <input
              id="delete-account-confirm"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={confirmText}
              onChange={(event) =>
                setConfirmText(event.target.value)
              }
              required
              disabled={loading}
              placeholder="Type DELETE here"
              aria-describedby="delete-account-help"
              className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-950 dark:text-white ${
                confirmText && !isConfirmed
                  ? "border-amber-400 focus:border-amber-500 focus:ring-amber-500/10 dark:border-amber-700"
                  : isConfirmed
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/10 dark:border-red-700"
                    : "border-slate-300 hover:border-slate-400 focus:border-red-500 focus:ring-red-500/10 dark:border-slate-700 dark:hover:border-slate-600 dark:focus:border-red-500"
              }`}
            />

            <p
              id="delete-account-help"
              className={`text-xs ${
                isConfirmed
                  ? "text-red-600 dark:text-red-400"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {isConfirmed
                ? "Confirmation entered. You can now proceed."
                : "Enter DELETE in capital letters exactly as shown."}
            </p>
          </div>

          {/* Delete button */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              Please make sure you have saved anything important.
            </p>

            <button
              type="submit"
              disabled={loading || !isConfirmed}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-red-600/20 transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" />
                  Deleting account...
                </>
              ) : (
                <>
                  <Trash2 size={17} />
                  Delete my account
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
