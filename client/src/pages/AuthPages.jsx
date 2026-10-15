
import { useState } from "react";
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
            Create thoughtful forms, gather useful feedback, and turn responses
            into insights — all in one calm workspace.
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
          <Link to="/login" className="flex items-center gap-2 font-extrabold lg:hidden">
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

function Field({
  label,
  icon: Icon,
  type = "text",
  ...props
}) {
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

function SubmitButton({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="btn-primary mt-2 w-full py-3.5"
    >
      {loading ? "Please wait..." : children}
      {!loading && <ArrowRight size={17} />}
    </button>
  );
}

// LOGIN
export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const update = (e) => {
    setForm((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(form);

      const next = searchParams.get("next");
      navigate(next?.startsWith("/") ? next : "/", { replace: true });
    } catch (error) {
      if (error.response?.data?.code === "EMAIL_NOT_VERIFIED") {
        navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
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

// REGISTER
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

  const update = (e) => {
    setForm((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await register(form);
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
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

// VERIFY EMAIL
export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
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
      const { data } = await api.post("/auth/resend-otp", { email });
      toast.success(data.message || "A new verification code was requested.");
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
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Field
          label="Six-digit verification code"
          icon={ShieldCheck}
          inputMode="numeric"
          placeholder="000000"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
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
        <ArrowLeft size={15} /> Back to sign in
      </Link>
    </AuthShell>
  );
}

// FORGOT PASSWORD
export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      toast.success(data.message || "If the account exists, reset instructions will be sent.");
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
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <SubmitButton loading={loading}>Send reset instructions</SubmitButton>
      </form>

      <Link
        to="/login"
        className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500"
      >
        <ArrowLeft size={15} /> Back to sign in
      </Link>
    </AuthShell>
  );
}

// RESET PASSWORD
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

  const update = (e) => {
    setForm((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post("/auth/reset-password", form);
      toast.success(data.message || "Password reset successfully.");
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
