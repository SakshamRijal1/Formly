import { useEffect, useRef, useState } from "react";
import {
  Camera,
  ImagePlus,
  LockKeyhole,
  Save,
  UserRound,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext";
import { api, getErrorMessage } from "../services/api";
import ThemeToggle from "../components/ThemeToggle";

const INITIAL_PASSWORD = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function Settings() {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef(null);
  const previewObjectUrl = useRef("");

  const [name, setName] = useState(user?.name || "");
  const [profileImage, setProfileImage] = useState(
    user?.profileImage || ""
  );
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageLoadError, setImageLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [password, setPassword] = useState(INITIAL_PASSWORD);

  // Keep local state synchronized with authentication state.
  useEffect(() => {
    setName(user?.name || "");
    setProfileImage(user?.profileImage || "");
    setImageLoadError(false);
  }, [user?.name, user?.profileImage]);

  // Create and clean up the local image preview.
  useEffect(() => {
    if (!selectedFile) {
      if (previewObjectUrl.current) {
        URL.revokeObjectURL(previewObjectUrl.current);
        previewObjectUrl.current = "";
      }

      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    previewObjectUrl.current = objectUrl;
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);

      if (previewObjectUrl.current === objectUrl) {
        previewObjectUrl.current = "";
      }
    };
  }, [selectedFile]);

  const chooseImage = (event) => {
    const file = event.target.files?.[0];

    // Allow selecting the same file again.
    event.target.value = "";

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Choose a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Profile images must be 5 MB or smaller.");
      return;
    }

    setImageLoadError(false);
    setSelectedFile(file);
  };

  const saveProfile = async (event) => {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Please enter your name.");
      return;
    }

    if (trimmedName.length > 100) {
      toast.error("Your name cannot exceed 100 characters.");
      return;
    }

    const nameChanged = trimmedName !== (user?.name || "");
    const imageChanged = Boolean(selectedFile);

    if (!nameChanged && !imageChanged) {
      toast("There are no profile changes to save.");
      return;
    }

    setSaving(true);

    try {
      let response;

      if (imageChanged) {
        const formData = new FormData();
        formData.append("name", trimmedName);
        formData.append("avatar", selectedFile);

        response = await api.put("/users", formData);
      } else {
        response = await api.patch("/users/profile", {
          name: trimmedName,
        });
      }

      const data = response.data;
      const updatedUser = data.user;

      if (!updatedUser) {
        throw new Error("The server did not return the updated user.");
      }

      // Preserve existing authentication fields if the API response
      // doesn't include them, while replacing updated profile fields.
      const nextUser = {
        ...user,
        ...updatedUser,
        id: updatedUser.id || updatedUser._id || user?.id,
        _id: updatedUser._id || updatedUser.id || user?._id,
        name: updatedUser.name ?? trimmedName,
        profileImage:
          updatedUser.profileImage ?? user?.profileImage ?? "",
      };

      // Update shared AuthContext so the navbar and other components
      // display the new profile without requiring a page reload.
      setUser(nextUser);

      // Update this page immediately too.
      setName(nextUser.name);
      setProfileImage(nextUser.profileImage);
      setImageLoadError(false);
      setSelectedFile(null);

      toast.success(data.message || "Profile updated successfully.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();

    if (
      !password.currentPassword ||
      !password.newPassword
    ) {
      toast.error("Enter your current and new passwords.");
      return;
    }

    if (
      password.newPassword.length < 8 ||
      password.newPassword.length > 128
    ) {
      toast.error("Password must be between 8 and 128 characters.");
      return;
    }

    if (
      !/[A-Za-z]/.test(password.newPassword) ||
      !/[0-9]/.test(password.newPassword)
    ) {
      toast.error("Your new password must contain a letter and a number.");
      return;
    }

    if (password.newPassword !== password.confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setChangingPassword(true);

    try {
      const { data } = await api.patch("/users/password", password);

      toast.success(data.message || "Password changed successfully.");
      setPassword({ ...INITIAL_PASSWORD });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setChangingPassword(false);
    }
  };

  const displayedImage = previewUrl || profileImage;
  const showImage = Boolean(displayedImage) && !imageLoadError;

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <div>
        <h1 className="text-2xl font-extrabold">Settings</h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage your profile, security, and appearance.
        </p>
      </div>

      {/* Profile details */}
      <section className="surface p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <UserRound className="text-violet-600" size={21} />
          <div>
            <h2 className="font-bold">Profile details</h2>
            <p className="mt-1 text-xs text-slate-500">
              Personalize your Formly account.
            </p>
          </div>
        </div>

        <form onSubmit={saveProfile} className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative h-24 w-24 shrink-0">
              <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-violet-100 text-3xl font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                {showImage ? (
                  <img
                    key={displayedImage}
                    src={displayedImage}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                    onError={() => setImageLoadError(true)}
                  />
                ) : (
                  (name.trim().charAt(0) || "U").toUpperCase()
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                aria-label="Choose profile image"
                className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-violet-600 text-white shadow-md transition hover:bg-violet-700 disabled:opacity-50 dark:border-slate-900"
              >
                <Camera size={17} />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">Profile picture</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Choose a JPG, PNG, or WebP image up to 5 MB.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={chooseImage}
                className="hidden"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving}
                  className="btn-secondary disabled:opacity-50"
                >
                  <ImagePlus size={16} />
                  Choose image
                </button>

                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setImageLoadError(false);
                    }}
                    disabled={saving}
                    className="btn-secondary disabled:opacity-50"
                  >
                    <X size={16} />
                    Cancel selection
                  </button>
                )}
              </div>

              {selectedFile && (
                <p className="mt-2 break-all text-xs text-violet-600">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold">
              Full name
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="field"
              required
              maxLength={100}
              autoComplete="name"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold">
              Email address
            </span>
            <input
              type="email"
              value={user?.email || ""}
              className="field opacity-70"
              disabled
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <span className="animate-spin">◌</span>
            ) : (
              <Save size={17} />
            )}
            {saving ? "Saving..." : "Save profile"}
          </button>
        </form>
      </section>

      {/* Change password */}
      <section className="surface p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <LockKeyhole className="text-violet-600" size={21} />
          <div>
            <h2 className="font-bold">Change password</h2>
            <p className="mt-1 text-xs text-slate-500">
              Use a strong password you don't use elsewhere.
            </p>
          </div>
        </div>

        <form onSubmit={changePassword} className="space-y-4">
          {[
            ["currentPassword", "Current password"],
            ["newPassword", "New password"],
            ["confirmPassword", "Confirm new password"],
          ].map(([key, label]) => (
            <label key={key} className="block">
              <span className="mb-2 block text-sm font-semibold">
                {label}
              </span>
              <input
                type="password"
                className="field"
                autoComplete={
                  key === "currentPassword"
                    ? "current-password"
                    : "new-password"
                }
                value={password[key]}
                onChange={(event) =>
                  setPassword((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
                required
                minLength={key === "currentPassword" ? undefined : 8}
                maxLength={128}
              />
            </label>
          ))}

          <button
            type="submit"
            disabled={changingPassword}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LockKeyhole size={17} />
            {changingPassword ? "Updating..." : "Update password"}
          </button>
        </form>
      </section>

      {/* Appearance */}
      <section className="surface flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="font-bold">Appearance</h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose your preferred theme.
          </p>
        </div>
        <ThemeToggle />
      </section>
    </div>
  );
}
