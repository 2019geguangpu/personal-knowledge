import { VISION_MAX_IMAGE_BYTES } from "@/lib/vision-debug-constants";

export function isLikelyVisionImageFile(f: File): boolean {
  if (f.type.startsWith("image/")) return true;
  if (
    f.type === "application/octet-stream" &&
    /\.(jpe?g|png|webp|heic|heif|gif|bmp|tif|tiff)$/i.test(f.name)
  ) {
    return true;
  }
  if (/\.(jpe?g|png|gif|webp|heic|heif|bmp|avif|tif|tiff|dng)$/i.test(f.name)) {
    return true;
  }
  if (!f.type && f.size > 0 && f.size <= VISION_MAX_IMAGE_BYTES) {
    return true;
  }
  return false;
}
