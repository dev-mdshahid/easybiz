export const PATHAO_ENVIRONMENTS = {
  sandbox: {
    id: "sandbox" as const,
    label: "Sandbox",
    baseUrl: "https://courier-api-sandbox.pathao.com",
  },
  production: {
    id: "production" as const,
    label: "Production",
    baseUrl: "https://api-hermes.pathao.com",
  },
};

export type PathaoEnvironment = keyof typeof PATHAO_ENVIRONMENTS;

export const PATHAO_DELIVERY_TYPES = {
  normal: 48,
  onDemand: 12,
} as const;

export const PATHAO_ITEM_TYPES = {
  document: 1,
  parcel: 2,
} as const;

export type PathaoCredentials = {
  environment: PathaoEnvironment;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
};

export type PathaoTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

export type PathaoStore = {
  store_id: number;
  store_name: string;
  is_active: number | boolean;
};

export type PathaoCreateOrderInput = {
  store_id: number;
  merchant_order_id: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  delivery_type: number;
  item_type: "parcel" | "document";
  item_quantity: number;
  item_weight: number;
  amount_to_collect: number;
  item_description?: string;
  special_instruction?: string;
};

export type PathaoCreateOrderPayload = {
  store_id: number;
  merchant_order_id: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  delivery_type: number;
  item_type: number;
  item_quantity: number;
  item_weight: number;
  amount_to_collect: number;
  item_description?: string;
  special_instruction?: string;
};

export type PathaoCreatedOrder = {
  consignment_id: string;
  merchant_order_id: string;
  order_status: string;
  delivery_fee: number | null;
};

export class PathaoApiError extends Error {
  readonly status: number;
  readonly errors: Record<string, string>;

  constructor(message: string, status: number, errors: Record<string, string> = {}) {
    super(message);
    this.name = "PathaoApiError";
    this.status = status;
    this.errors = errors;
  }
}

const TOKEN_SKEW_MS = 60_000;
const REQUEST_TIMEOUT_MS = 20_000;

export function isPathaoEnvironment(value: string): value is PathaoEnvironment {
  return value === "sandbox" || value === "production";
}

export function pathaoBaseUrl(environment: PathaoEnvironment): string {
  return PATHAO_ENVIRONMENTS[environment].baseUrl;
}

export function tokenNeedsRefresh(
  expiresAt: string | Date | null | undefined,
  now = Date.now(),
  skewMs = TOKEN_SKEW_MS,
): boolean {
  if (!expiresAt) return true;
  const ms = typeof expiresAt === "string" ? Date.parse(expiresAt) : expiresAt.getTime();
  if (!Number.isFinite(ms)) return true;
  return now >= ms - skewMs;
}

export function tokensFromIssueResponse(json: {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}): PathaoTokens {
  const accessToken = String(json.access_token ?? "").trim();
  if (!accessToken) {
    throw new PathaoApiError("Pathao did not return an access token.", 401);
  }
  const expiresIn = Number(json.expires_in);
  const seconds = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600;
  return {
    accessToken,
    refreshToken: String(json.refresh_token ?? "").trim(),
    expiresAt: new Date(Date.now() + seconds * 1000).toISOString(),
  };
}

export function buildCreateOrderPayload(
  input: PathaoCreateOrderInput,
): PathaoCreateOrderPayload {
  const payload: PathaoCreateOrderPayload = {
    store_id: input.store_id,
    merchant_order_id: input.merchant_order_id,
    recipient_name: input.recipient_name,
    recipient_phone: input.recipient_phone,
    recipient_address: input.recipient_address,
    delivery_type: input.delivery_type,
    item_type:
      input.item_type === "document"
        ? PATHAO_ITEM_TYPES.document
        : PATHAO_ITEM_TYPES.parcel,
    item_quantity: input.item_quantity,
    item_weight: input.item_weight,
    amount_to_collect: Math.round(input.amount_to_collect),
  };
  const description = input.item_description?.trim();
  if (description) payload.item_description = description;
  const instruction = input.special_instruction?.trim();
  if (instruction) payload.special_instruction = instruction;
  return payload;
}

export function isEligibleForPathaoCreate(row: {
  status: string;
  pathao_consignment_id?: string | null;
}): boolean {
  if ((row.pathao_consignment_id ?? "").trim()) return false;
  return row.status === "ready" || row.status === "exported" || row.status === "failed";
}

async function fetchJson(
  url: string,
  init: RequestInit,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    let json: Record<string, unknown> = {};
    try {
      json = (await response.json()) as Record<string, unknown>;
    } catch {
      json = {};
    }
    return { status: response.status, json };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new PathaoApiError("Pathao request timed out.", 408);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function fieldErrors(json: Record<string, unknown>): Record<string, string> {
  const errors = json.errors;
  if (!errors || typeof errors !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
    if (typeof value === "string") out[key] = value;
    else if (Array.isArray(value) && typeof value[0] === "string") out[key] = value[0];
  }
  return out;
}

function errorMessage(json: Record<string, unknown>, status: number): string {
  const message = json.message ?? json.error;
  if (typeof message === "string" && message.trim()) return message;
  const first = Object.values(fieldErrors(json))[0];
  if (first) return first;
  return `Pathao request failed (${status}).`;
}

export async function issuePathaoToken(
  credentials: PathaoCredentials,
  refreshToken?: string,
): Promise<PathaoTokens> {
  const body = refreshToken
    ? {
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }
    : {
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        grant_type: "password",
        username: credentials.username,
        password: credentials.password,
      };

  const { status, json } = await fetchJson(
    `${pathaoBaseUrl(credentials.environment)}/aladdin/api/v1/issue-token`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (status >= 300) {
    throw new PathaoApiError(errorMessage(json, status), status, fieldErrors(json));
  }
  return tokensFromIssueResponse(json as { access_token?: string; refresh_token?: string; expires_in?: number });
}

async function authorizedRequest(
  credentials: PathaoCredentials,
  tokens: PathaoTokens | null,
  path: string,
  init: RequestInit,
  retried = false,
): Promise<{ json: Record<string, unknown>; tokens: PathaoTokens; status: number }> {
  let current = tokens;
  if (!current || tokenNeedsRefresh(current.expiresAt)) {
    try {
      current = await issuePathaoToken(
        credentials,
        current?.refreshToken ? current.refreshToken : undefined,
      );
    } catch {
      current = await issuePathaoToken(credentials);
    }
  }

  const { status, json } = await fetchJson(
    `${pathaoBaseUrl(credentials.environment)}${path}`,
    {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${current.accessToken}`,
        ...(init.headers ?? {}),
      },
    },
  );

  if (status === 401 && !retried) {
    const fresh = await issuePathaoToken(credentials);
    return authorizedRequest(credentials, fresh, path, init, true);
  }

  if (status === 429 && !retried) {
    const retryAfter = Number((json as { retry_after?: number }).retry_after ?? 1);
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(5, Number.isFinite(retryAfter) ? retryAfter : 1) * 1000),
    );
    return authorizedRequest(credentials, current, path, init, true);
  }

  if (status >= 300) {
    throw new PathaoApiError(errorMessage(json, status), status, fieldErrors(json));
  }

  return { json, tokens: current, status };
}

export async function getPathaoUser(
  credentials: PathaoCredentials,
  tokens: PathaoTokens | null,
): Promise<{ name: string; tokens: PathaoTokens }> {
  const { json, tokens: next } = await authorizedRequest(
    credentials,
    tokens,
    "/aladdin/api/v1/user/short-info",
    { method: "GET" },
  );
  const data = (json.data ?? json) as Record<string, unknown>;
  const name = String(data.name ?? data.email ?? credentials.username);
  return { name, tokens: next };
}

export async function getPathaoStores(
  credentials: PathaoCredentials,
  tokens: PathaoTokens | null,
): Promise<{ stores: PathaoStore[]; tokens: PathaoTokens }> {
  const { json, tokens: next } = await authorizedRequest(
    credentials,
    tokens,
    "/aladdin/api/v1/stores",
    { method: "GET" },
  );
  const data = json.data as Record<string, unknown> | unknown[] | undefined;
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { data?: unknown[] } | undefined)?.data)
      ? ((data as { data: unknown[] }).data)
      : [];
  const stores = rows
    .map((row) => {
      const item = row as Record<string, unknown>;
      return {
        store_id: Number(item.store_id),
        store_name: String(item.store_name ?? ""),
        is_active: (item.is_active as number | boolean) ?? 1,
      };
    })
    .filter((store) => Number.isFinite(store.store_id) && store.store_id > 0);
  return { stores, tokens: next };
}

export async function createPathaoOrder(
  credentials: PathaoCredentials,
  tokens: PathaoTokens | null,
  input: PathaoCreateOrderInput,
): Promise<{ order: PathaoCreatedOrder; tokens: PathaoTokens; payload: PathaoCreateOrderPayload }> {
  const payload = buildCreateOrderPayload(input);
  const { json, tokens: next } = await authorizedRequest(
    credentials,
    tokens,
    "/aladdin/api/v1/orders",
    { method: "POST", body: JSON.stringify(payload) },
  );
  const data = (json.data ?? {}) as Record<string, unknown>;
  const consignmentId = String(data.consignment_id ?? "").trim();
  if (!consignmentId) {
    throw new PathaoApiError("Pathao created the order but returned no consignment id.", 502);
  }
  const feeRaw = data.delivery_fee;
  const deliveryFee =
    typeof feeRaw === "number"
      ? feeRaw
      : typeof feeRaw === "string" && feeRaw.trim()
        ? Number(feeRaw)
        : null;
  return {
    payload,
    tokens: next,
    order: {
      consignment_id: consignmentId,
      merchant_order_id: String(data.merchant_order_id ?? input.merchant_order_id),
      order_status: String(data.order_status ?? ""),
      delivery_fee: deliveryFee != null && Number.isFinite(deliveryFee) ? deliveryFee : null,
    },
  };
}
