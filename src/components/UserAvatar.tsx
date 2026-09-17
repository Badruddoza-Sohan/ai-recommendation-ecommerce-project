import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { toast } from "@/lib/toast";

export function getRoleHome(role?: string | null) {
  const normalizedRole = role?.trim().toLowerCase();
  if (normalizedRole === "seller") return "/seller";
  if (normalizedRole === "admin") return "/admin";
  if (normalizedRole === "customer") return "/dashboard";
  return "/";
}

type UserAvatarProps = {
  user?: { name?: string | null; avatar?: string | null } | null;
  size?: "sm" | "md" | "lg";
  editable?: boolean;
  className?: string;
};

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-20 w-20 text-2xl",
};

export function UserAvatar({ user, size = "md", editable = false, className = "" }: UserAvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const utils = trpc.useUtils();
  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      toast.success("Profile image updated.");
    },
    onError: (error) => toast.error(error.message || "Unable to update profile image."),
  });

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile images must be 5 MB or less.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "Upload failed.");
      updateProfile.mutate({ avatar: result.url });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload profile image.");
    } finally {
      setIsUploading(false);
    }
  };

  const avatar = (
    <div className={`relative shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 ${sizeClasses[size]} ${className}`}>
      <img src={user?.avatar || "/assets/default-avatar.svg"} alt="" className="h-full w-full object-cover" />
      {editable && isUploading && <Loader2 className="absolute inset-0 m-auto h-5 w-5 text-indigo-600" />}
    </div>
  );

  if (!editable) return avatar;
  return (
    <button type="button" className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500" onClick={() => inputRef.current?.click()} disabled={isUploading} aria-label="Change profile image" title="Change profile image">
      {avatar}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleUpload(file); event.target.value = ""; }} />
    </button>
  );
}
