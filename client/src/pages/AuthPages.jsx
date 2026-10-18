import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext";
import { api, getErrorMessage } from "../services/api";
import ThemeToggle from "../components/ThemeToggle";

// --------------------------------------------------
// AUTH LAYOUT
// --------------------------------------------------

function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen bg-white dark:bg-[#0b0b10] lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#171326] p-12 text-white lg:flex xl:p-16">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-violet-600/30 blur-[100px]" />
        <div className="absolute -bottom-20 -right-10 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-[100px]" />

        <Link to="/login" className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500">
            <Sparkles size={23} />
          </span>
          <span className="text-xl font-extrabold">Formly</span>
        </Link>

        <div className="relative max-w-lg">
          <p className="mb-5 text-sm font-semibold text-violet-300">
            YOUR IDEAS, BEAUTIFULLY ORGANIZED
          </p>

          <h2 className="text-4xl font-extrabold leading-tight xl:text-5xl">
            Better questions.
            <br />
            <span className="text-violet-300">Better answers.</span>
          </h2>

          <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">
            Create thoughtful forms, gather useful feedback, and turn
            responses into insights — all in one calm workspace.
          </p>

          <div className="mt-9 grid grid-cols-2 gap-3">
            {[
              "Create with ease",
              "Collect responses",
              "Stay organized",
              "Learn from data",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-white/10 bg-white/[0.05] p-4 text-sm font-semibold"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-400">
          A simpler way to ask, understand, and grow.
        </p>
      </section>

      <section className="flex min-h-screen flex-col p-5 sm:p-10">
        <div className="flex items-center justify-between lg:justify-end">
          <Link
            to="/login"
            className="flex items-center gap-2 font-extrabold lg:hidden"
          >
            <Sparkles className="text-violet-600" size={22} />
            Formly
          </Link>

          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col justify-center py-12">
          <p className="mb-3 text-sm font-bold text-violet-600">
            WELCOME TO FORMLY
          </p>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {title}
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>

          <div className="mt-8">{children}</div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Welcome to your creative workspace.
        </p>
      </section>
    </div>
  );
}

// --------------------------------------------------
// REUSABLE INPUT FIELD
// --------------------------------------------------

function Field({ label, icon: Icon, type = "text", ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <label className="block">
      {label && (
        <span className="mb-2 block text-sm font-semibold">{label}</span>
      )}

      <span className="relative block">
        {Icon && (
          <Icon
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
        )}

        <input
          {...props}
          type={isPassword && showPassword ? "text" : type}
          className={`field ${Icon ? "pl-11" : ""} ${
            isPassword ? "pr-11" : ""
          }`}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </span>
    </label>
  );
}

// --------------------------------------------------
// GOOGLE AUTHENTICATION BUTTON
// --------------------------------------------------

function GoogleButton({ disabled = false }) {
  const continueWithGoogle = () => {
    try {
      const baseURL = api.defaults.baseURL?.trim();

      if (!baseURL) {
        toast.error("The API URL is not configured.");
        return;
      }

      // Resolve the OAuth endpoint using the configured API base URL.
      // Example:
      // https://formly-x8f0.onrender.com/api
      // becomes:
      // https://formly-x8f0.onrender.com/api/auth/google
      const normalizedBaseURL = baseURL.replace(/\/+$/, "");
      const googleURL = new URL(
        `${normalizedBaseURL}/auth/google`,
        window.location.origin
      );

      if (!["http:", "https:"].includes(googleURL.protocol)) {
        toast.error("The Google authentication URL is invalid.");
        return;
      }

      // OAuth must use a full browser redirect, not an Axios request.
      window.location.assign(googleURL.href);
    } catch (error) {
      console.error("Google OAuth redirect error:", error);
      toast.error("Unable to start Google sign-in. Please try again.");
    }
  };

  return (
    <button
      type="button"
      onClick={continueWithGoogle}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      <svg
        viewBox="0 0 48 48"
        aria-hidden="true"
        className="h-5 w-5 shrink-0"
      >
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
          transform="translate(0 4)"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 38.03 46.98 31.95 46.98 24.55Z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"
          transform="translate(0 4)"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.44-4.89 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
        />
      </svg>

      Continue with Google
    </button>
  );
}

// --------------------------------------------------
// SUBMIT BUTTON
// --------------------------------------------------

function SubmitButton({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="btn-primary mt-2 flex w-full items-center justify-center gap-2 py-3.5 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Please wait..." : children}
      {!loading && <ArrowRight size={17} />}
    </button>
  );
}

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  // Display OAuth errors sent back by the backend.
  // Example: /login?googleError=Google%20authentication%20failed
  useEffect(() => {
    const googleError = searchParams.get("googleError");

    if (!googleError) return;

    toast.error(googleError);

    // Remove only the Google error parameter.
    // Preserve other query parameters such as "next".
    const params = new URLSearchParams(searchParams);
    params.delete("googleError");

    const query = params.toString();

    navigate(
      {
        pathname: "/login",
        search: query ? `?${query}` : "",
      },
      { replace: true }
    );
  }, [searchParams, navigate]);

  const update = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      await login(form);

      const next = searchParams.get("next");

      navigate(
        next?.startsWith("/") && !next.startsWith("//")
          ? next
          : "/",
        { replace: true }
      );
    } catch (error) {
      if (error.response?.data?.code === "EMAIL_NOT_VERIFIED") {
        navigate(
          `/verify-email?email=${encodeURIComponent(form.email)}`
        );
      } else {
        toast.error(getErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
    >
      <GoogleButton />

      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        <span className="text-xs font-medium text-slate-400">
          OR CONTINUE WITH EMAIL
        </span>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>

      <form onSubmit={submit} className="space-y-5">
        <Field
          label="Email address"
          name="email"
          type="email"
          icon={Mail}
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={update}
          required
        />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">Password</span>

            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-violet-600 hover:text-violet-700"
            >
              Forgot password?
            </Link>
          </div>

          <Field
            name="password"
            type="password"
            icon={LockKeyhole}
            placeholder="Enter your password"
            autoComplete="current-password"
            value={form.password}
            onChange={update}
            required
          />
        </div>

        <SubmitButton loading={loading}>Sign in</SubmitButton>
      </form>

      <p className="mt-7 text-center text-sm text-slate-500">
        Don't have an account?{" "}
        <Link to="/register" className="font-bold text-violet-600">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}

// --------------------------------------------------
// REGISTER
// --------------------------------------------------

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const update = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await register(form);

      navigate(
        `/verify-email?email=${encodeURIComponent(form.email)}`
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Enter your details to create your Formly workspace."
    >
      <GoogleButton />

      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        <span className="text-xs font-medium text-slate-400">
          OR REGISTER WITH EMAIL
        </span>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Full name"
          name="name"
          icon={UserRound}
          placeholder="Your name"
          autoComplete="name"
          maxLength={100}
          value={form.name}
          onChange={update}
          required
        />

        <Field
          label="Email address"
          name="email"
          type="email"
          icon={Mail}
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={update}
          required
        />

        <Field
          label="Password"
          name="password"
          type="password"
          icon={LockKeyhole}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          value={form.password}
          onChange={update}
          required
        />

        <Field
          label="Confirm password"
          name="confirmPassword"
          type="password"
          icon={ShieldCheck}
          placeholder="Enter your password again"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={update}
          required
        />

        <SubmitButton loading={loading}>Create account</SubmitButton>
      </form>

      <p className="mt-7 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-bold text-violet-600">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

// --------------------------------------------------
// VERIFY EMAIL
// --------------------------------------------------

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();

  const [email, setEmail] = useState(
    searchParams.get("email") || ""
  );
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      await verifyEmail({ email, otp });
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);

    try {
      const { data } = await api.post("/auth/resend-otp", {
        email,
      });

      toast.success(
        data.message || "A new verification code was requested."
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      title="Verify your email"
      subtitle="Enter the verification code sent to your email address."
    >
      <form onSubmit={submit} className="space-y-5">
        <Field
          label="Email address"
          type="email"
          icon={Mail}
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <Field
          label="Six-digit verification code"
          icon={ShieldCheck}
          inputMode="numeric"
          placeholder="000000"
          maxLength={6}
          value={otp}
          onChange={(event) =>
            setOtp(event.target.value.replace(/\D/g, ""))
          }
          required
        />

        <SubmitButton loading={loading}>Verify email</SubmitButton>
      </form>

      <button
        type="button"
        onClick={resend}
        disabled={resending || !email}
        className="mt-5 w-full text-sm font-semibold text-violet-600 disabled:opacity-50"
      >
        {resending ? "Requesting code..." : "Resend verification code"}
      </button>

      <Link
        to="/login"
        className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-500"
      >
        <ArrowLeft size={15} />
        Back to sign in
      </Link>
    </AuthShell>
  );
}

// --------------------------------------------------
// FORGOT PASSWORD
// --------------------------------------------------

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { data } = await api.post("/auth/forgot-password", {
        email,
      });

      toast.success(
        data.message ||
          "If the account exists, reset instructions will be sent."
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email address to request password reset instructions."
    >
      <form onSubmit={submit} className="space-y-5">
        <Field
          label="Email address"
          type="email"
          icon={Mail}
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <SubmitButton loading={loading}>
          Send reset instructions
        </SubmitButton>
      </form>

      <Link
        to="/login"
        className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500"
      >
        <ArrowLeft size={15} />
        Back to sign in
      </Link>
    </AuthShell>
  );
}

// --------------------------------------------------
// RESET PASSWORD
// --------------------------------------------------

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: searchParams.get("email") || "",
    token: searchParams.get("token") || "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);

  const update = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post("/auth/reset-password", form);

      toast.success(
        data.message || "Password reset successfully."
      );

      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create a new password"
      subtitle="Choose a strong password for your account."
    >
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Email address"
          name="email"
          type="email"
          icon={Mail}
          value={form.email}
          onChange={update}
          required
        />

        <Field
          label="Reset token"
          name="token"
          icon={ShieldCheck}
          value={form.token}
          onChange={update}
          required
        />

        <Field
          label="New password"
          name="password"
          type="password"
          icon={LockKeyhole}
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          value={form.password}
          onChange={update}
          required
        />

        <Field
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          icon={ShieldCheck}
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={update}
          required
        />

        <SubmitButton loading={loading}>Reset password</SubmitButton>
      </form>
    </AuthShell>
  );
}
