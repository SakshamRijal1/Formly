
import { useState } from "react";
import { Camera, LockKeyhole, Save, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { api, getErrorMessage } from "../services/api";
import ThemeToggle from "../components/ThemeToggle";

export default function Settings() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [profileImage, setProfileImage] = useState(user?.profileImage || "");
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data } = await api.patch("/users/profile", { name, profileImage });
      setUser(data.user);
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data } = await api.patch("/users/password", password);
      toast.success(data.message);
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <div>
        <h1 className="text-2xl font-extrabold">Settings</h1>
        <p className="mt-2 text-sm text-slate-500">Manage your profile, security, and appearance.</p>
      </div>

      <section className="surface p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <UserRound className="text-violet-600" size={21} />
          <div>
            <h2 className="font-bold">Profile details</h2>
            <p className="mt-1 text-xs text-slate-500">Personalize your Formly account.</p>
          </div>
        </div>

        <form onSubmit={saveProfile} className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-violet-100 text-xl font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
              {profileImage ? (
                <img src={profileImage} alt="" className="h-full w-full object-cover" />
              ) : (
                name.charAt(0).toUpperCase() || "U"
              )}
            </div>
            <div className="min-w-0 flex-1">
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Camera size={16} /> Profile image URL
              </label>
              <input
                value={profileImage}
                onChange={(e) => setProfileImage(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="field"
              />
              <p className="mt-2 text-xs text-slate-400">
                Direct image URLs only for now. ImageKit upload will be added separately.
              </p>
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Full name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="field" required maxLength={100} />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Email address</span>
            <input value={user?.email || ""} className="field opacity-70" disabled />
          </label>

          <button disabled={saving} className="btn-primary">
            <Save size={17} /> Save profile
          </button>
        </form>
      </section>

      <section className="surface p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <LockKeyhole className="text-violet-600" size={21} />
          <div>
            <h2 className="font-bold">Change password</h2>
            <p className="mt-1 text-xs text-slate-500">Use a strong password you don't use elsewhere.</p>
          </div>
        </div>

        <form onSubmit={changePassword} className="space-y-4">
          {[
            ["currentPassword", "Current password"],
            ["newPassword", "New password"],
            ["confirmPassword", "Confirm new password"],
          ].map(([key, label]) => (
            <label key={key} className="block">
              <span className="mb-2 block text-sm font-semibold">{label}</span>
              <input
                type="password"
                className="field"
                autoComplete="currentPassword" 
                value={password[key]}
                onChange={(e) => setPassword({ ...password, [key]: e.target.value })}
                required
                minLength={key === "currentPassword" ? undefined : 8}
                maxLength={128}
              />
            </label>
          ))}
          <button disabled={saving} className="btn-primary">
            <LockKeyhole size={17} /> Update password
          </button>
        </form>
      </section>

      <section className="surface flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="font-bold">Appearance</h2>
          <p className="mt-1 text-sm text-slate-500">Choose your preferred theme.</p>
        </div>
        <ThemeToggle />
      </section>
    </div>
  );
}
