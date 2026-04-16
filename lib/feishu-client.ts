const FEISHU_OPEN_API = "https://open.feishu.cn/open-apis";

type TenantTokenJson = {
  code: number;
  msg?: string;
  tenant_access_token?: string;
  expire?: number;
};

type RawContentJson = {
  code: number;
  msg?: string;
  data?: { content?: string };
};

let cachedTenantToken: { token: string; expiresAtMs: number } | null = null;

/**
 * 从整段 URL 或裸 token 得到 docx 的 document_id（27 位）。
 * 仅处理路径中含 `/docx/` 的链接；Wiki 等场景需自行在文档里取 docx token。
 */
export function normalizeFeishuDocumentId(input: string): string {
  const trimmed = input.trim();
  const fromUrl = trimmed.match(/\/docx\/([A-Za-z0-9]+)/);
  if (fromUrl) return fromUrl[1]!;
  return trimmed;
}

export function assertValidDocxDocumentId(id: string): void {
  if (!/^[A-Za-z0-9]{27}$/.test(id)) {
    throw new Error(
      "document_id 须为 27 位字母数字，可从云文档 URL「/docx/」后复制；Wiki 内嵌文档需使用新版文档 token",
    );
  }
}

export async function getFeishuTenantAccessToken(
  appId: string,
  appSecret: string,
): Promise<string> {
  const now = Date.now();
  if (cachedTenantToken && cachedTenantToken.expiresAtMs > now + 60_000) {
    return cachedTenantToken.token;
  }

  const res = await fetch(
    `${FEISHU_OPEN_API}/auth/v3/tenant_access_token/internal`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    },
  );

  const json = (await res.json()) as TenantTokenJson;
  if (json.code !== 0 || !json.tenant_access_token) {
    throw new Error(json.msg ?? `飞书 tenant_access_token 失败 (code=${json.code})`);
  }

  const expireSec = json.expire ?? 7200;
  cachedTenantToken = {
    token: json.tenant_access_token,
    expiresAtMs: now + expireSec * 1000,
  };

  return json.tenant_access_token;
}

export async function fetchDocxRawContent(
  documentId: string,
  tenantAccessToken: string,
): Promise<string> {
  const url = `${FEISHU_OPEN_API}/docx/v1/documents/${encodeURIComponent(documentId)}/raw_content`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${tenantAccessToken}` },
  });

  const json = (await res.json()) as RawContentJson;
  if (json.code !== 0) {
    throw new Error(json.msg ?? `飞书 raw_content 失败 (code=${json.code})`);
  }

  const content = json.data?.content;
  if (typeof content !== "string") {
    throw new Error("飞书返回的纯文本字段缺失");
  }

  return content;
}
