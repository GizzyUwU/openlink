interface ApiOptions {
  method?: "GET" | "POST";
  data?: any;
  headers?: Record<string, string>;
  body?: any;
  cacheTtl?: number;
  forceRefresh?: boolean;
}

type CacheEntry = {
  data: Response | any;
  timestamp: number;
  ttl: number;
  isResponse: boolean;
};

const memoryCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<any>>();

function makeCacheKey(url: string, options: ApiOptions) {
  const method = options.method ?? "GET";

  if (method === "POST" && options.body) {
    try {
      const parsed =
        typeof options.body === "string"
          ? JSON.parse(options.body)
          : structuredClone(options.body);

      const stripUuid = (obj: any) => {
        if (Array.isArray(obj)) {
          for (const item of obj) {
            stripUuid(item);
          }
        } else if (obj && typeof obj === "object") {
          for (const k of Object.keys(obj)) {
            if (k === "uuid") delete obj[k];
            else stripUuid(obj[k]);
          }
        }
      };

      stripUuid(parsed);

      return `${method}:${url}:${JSON.stringify(parsed)}`;
    } catch {
      return `${method}:${url}:${options.body}`;
    }
  }

  return `${method}:${url}`;
}

export async function callApi(url: string, options: ApiOptions = {}) {
  const { headers } = options;
  const cacheTtl = options.cacheTtl ?? 60_000;
  const forceRefresh = options.forceRefresh ?? false;

  if (!url) throw new Error("URL must be provided");
  const key = makeCacheKey(url, options);

  const cached = memoryCache.get(key);
  if (cached && !forceRefresh) {
    const expired = Date.now() - cached.timestamp > cached.ttl;
    if (!expired) {
      if (cached.isResponse) {
        return new Response(cached.data.body, cached.data.init);
      }
      return cached.data;
    }
    memoryCache.delete(key);
  }

  if (inflight.has(key) && !forceRefresh) {
    return inflight.get(key)!;
  }

  const parsedUrl = new URL(url, globalThis.location.origin);
  const pathname = parsedUrl.pathname.split("/").filter(Boolean);

  const handleDemo = async () => {
    const accountType = pathname[1] as "parent" | "employee" | "learner";
    if (!["parent", "employee", "learner"].includes(accountType)) {
      throw new Error("Demo accountType must be parent, employee, or learner");
    }

    const apiMethod = parsedUrl.searchParams.get("method");
    if (!apiMethod) {
      throw new Error("Missing ?method= query parameter in URL for demo mode.");
    }

    const [folder, subfolderCandidate] = apiMethod.split(".");

    const fetchDemoJsonTauri = async () => {
      const { exists, readTextFile } = await import("@tauri-apps/plugin-fs");
      const { resourceDir } = await import("@tauri-apps/api/path");
      const baseDir = await resourceDir() + "/_up_/src/public/assets/jsons";
      const paths = [
        `${baseDir}/${folder}/${subfolderCandidate}/${accountType}/${apiMethod}.json`,
        `${baseDir}/${folder}/${apiMethod}.json`,
      ];

      for (const path of paths) {
        if (await exists(path)) {
          return { demo: JSON.parse(await readTextFile(path)) };
        }
      }
      return null;
    };

    const fetchDemoJsonWeb = async () => {
      const paths = [
        `/jsons/${folder}/${subfolderCandidate}/${accountType}/${apiMethod}.json`,
        `/jsons/${folder}/${apiMethod}.json`,
      ];

      for (const path of paths) {
        try {
          const res = await fetch(path);
          if (res.ok) {
            const data = await res.json();
            return { demo: data };
          }
        } catch {
          continue; // try next path
        }
      }

      return null;
    };

    const res = globalThis.__TAURI__ ? await fetchDemoJsonTauri() : await fetchDemoJsonWeb();
    if (!res) throw new Error(`Failed to fetch demo JSON for method: ${apiMethod}`);

    memoryCache.set(key, {
      data: res,
      timestamp: Date.now(),
      ttl: cacheTtl,
      isResponse: false,
    });

    return res;
  };


  const promise = (async () => {
    if (pathname[0] === "demo" && !url.includes("?networkCheck=true")) {
      return await handleDemo();
    }

    const fetchOptions: RequestInit = {
      method: options.method,
      headers: { ...headers },
      body: options.body ? options.body : undefined,
    };

    const response = await (globalThis.__TAURI__
      ? (async () => {
        const { fetch } = await import("@tauri-apps/plugin-http");
        return await fetch(url, fetchOptions);
      })()
      : fetch(url, fetchOptions));

    let shouldCache = false;
    const cloned = response.clone();
    const jsonBody = await cloned.json();
    if (jsonBody?.result?.success === true) shouldCache = true;

    if (shouldCache) {
      const bodyBuffer = await response.clone().arrayBuffer();
      const cachedResponse = {
        body: bodyBuffer,
        init: {
          status: response.status,
          statusText: response.statusText,
          headers: Array.from(response.headers.entries()),
        },
      };
      memoryCache.set(key, { data: cachedResponse, timestamp: Date.now(), ttl: cacheTtl, isResponse: true });
    }

    return response.clone();
  })();

  inflight.set(key, promise);

  try {
    const result = await promise;
    return result;
  } finally {
    inflight.delete(key);
  }
}
