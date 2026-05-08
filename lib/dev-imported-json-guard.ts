/** 写入 data/imported 的 dev API 与页面：仅在本地 development 构建下启用。 */
export function isDevImportedJsonSaveEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}
