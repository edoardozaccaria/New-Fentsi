import hotToast from "react-hot-toast";

interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "success" | "error";
}

export function toast({ title, description, variant }: ToastOptions) {
  const message = description ? `${title} — ${description}` : title;
  if (variant === "error") {
    hotToast.error(message);
  } else if (variant === "success") {
    hotToast.success(message);
  } else {
    hotToast(message);
  }
}
