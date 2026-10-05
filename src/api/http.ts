import type { ProblemDetail } from './types';

/** Origen de la API: vacio en desarrollo (proxy de Vite); en la app nativa, el dominio del backend. */
const API_ORIGIN = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
export const API_BASE = `${API_ORIGIN}/latk-api`;

export class ApiError extends Error {
  readonly status: number;
  readonly title: string;
  readonly validationErrors: ProblemDetail['validationErrors'];
  /** Codigo estable (por ejemplo QUOTA_EXCEEDED) para reaccionar sin leer el texto. */
  readonly code?: string;
  /** El cuerpo completo: trae los datos extra del error. */
  readonly problem: ProblemDetail;

  constructor(problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `Error ${problem.status}`);
    this.name = 'ApiError';
    this.status = problem.status;
    this.title = problem.title ?? 'Error';
    this.validationErrors = problem.validationErrors;
    this.code = problem.code;
    this.problem = problem;
  }
}

type TokenProvider = () => string | null;
type UnauthorizedHandler = () => void;

let tokenProvider: TokenProvider = () => null;
let onUnauthorized: UnauthorizedHandler = () => undefined;

/** La capa HTTP no importa el store de auth: se configura desde afuera (sin ciclos). */
export function configureHttp(provider: TokenProvider, unauthorized: UnauthorizedHandler) {
  tokenProvider = provider;
  onUnauthorized = unauthorized;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = tokenProvider();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch {
    throw new ApiError({
      status: 0,
      title: 'Sin conexion',
      detail: 'No se pudo contactar al servidor',
    });
  }

  if (response.status === 401 && token) {
    // Token vencido o revocado: se cierra la sesion local.
    onUnauthorized();
  }
  if (!response.ok) {
    throw new ApiError(await readProblem(response));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function readProblem(response: Response): Promise<ProblemDetail> {
  try {
    const body = (await response.json()) as Partial<ProblemDetail>;
    return { status: response.status, ...body };
  } catch {
    return { status: response.status, title: response.statusText };
  }
}
