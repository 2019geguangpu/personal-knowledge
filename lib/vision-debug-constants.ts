export const DEFAULT_VISION_PROMPT =
  "请尽可能识别图中的文字与数值（如属性、装备、技能描述等），用清晰的 Markdown 或 JSON 风格输出，便于后续整理；若看不清请说明。";

export const VISION_FILE_INPUT_ID = "pk-vision-file-input";

export const VISION_IMAGE_ACCEPT =
  "image/*,image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,image/heif,image/bmp,image/tiff,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.bmp,.tif,.tiff";

export const VISION_MAX_IMAGE_BYTES = 48 * 1024 * 1024;

/** 单次多选上限 */
export const VISION_MAX_FILES = 24;

/** 同时请求视觉接口的路数 */
export const VISION_CONCURRENCY = 2;
