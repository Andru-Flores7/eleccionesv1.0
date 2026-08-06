import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const trimmed = url.trim();
    if (!trimmed) return "";

    if (trimmed.includes("drive.google.com") || trimmed.includes("googleusercontent.com")) {
      const u = new URL(trimmed);
      const parts = u.pathname.split("/").filter(Boolean);
      const driveIdIndex = parts.indexOf("d");
      let fileId = "";
      if (driveIdIndex >= 0 && parts[driveIdIndex + 1]) {
        fileId = parts[driveIdIndex + 1];
      } else {
        fileId = u.searchParams.get("id") || "";
      }
      if (fileId) {
        return `https://lh3.googleusercontent.com/d/${fileId}`;
      }
    }
    return trimmed;
  } catch {
    return url ?? "";
  }
}

