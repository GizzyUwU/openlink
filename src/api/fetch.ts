interface ApiOptions {
  method?: "GET" | "POST";
  data?: any;
  headers?: Record<string, string>;
  body?: any;
}

export async function callApi(url: string, options: ApiOptions = {}) {
  const { headers } = options;
  if (!url) throw new Error("URL must be provided");
  const parsedUrl = new URL(url, window.location.origin);
  const pathname = parsedUrl.pathname.split("/").filter(Boolean);
  if (pathname[0] === "demo") {
    const accountType = pathname[1] as "parent" | "employee" | "learner";
    const apiMethod = parsedUrl.searchParams.get("method");

    if (!["parent", "employee", "learner"].includes(accountType)) {
      throw new Error("Demo accountType must be parent, employee, or learner");
    }

    if (!apiMethod) {
      throw new Error("Missing ?method= query parameter in URL for demo mode.");
    }

    if (window.__TAURI__) {
      const { exists, readTextFile } = await import("@tauri-apps/plugin-fs");
      const { resourceDir } = await import("@tauri-apps/api/path");
      const [folder, subfolderCandidate] = apiMethod.split(".");
      const possiblePaths = [
        `${await resourceDir()}/_up_/src/public/assets/jsons/${folder}/${subfolderCandidate}/${accountType}/${apiMethod}.json`,
        `${await resourceDir()}/_up_/src/public/assets/jsons/${folder}/${apiMethod}.json`,
      ];
      let res: any;
      for (const path of possiblePaths) {
        const filePath = await exists(path);
        if (filePath) {
          res = {
            demo: JSON.parse(await readTextFile(path)),
          };
        } else {
          continue;
        }
      }

      if (!res) {
        throw new Error(`Failed to fetch demo JSON for method: ${apiMethod}`);
      }
      return res;
    } else {
      const [folder, subfolderCandidate] = apiMethod.split(".");
      const possiblePaths = [
        `/src/assets/jsons/${folder}/${subfolderCandidate}/${accountType}/${apiMethod}.json`,
        `/src/assets/jsons/${folder}/${apiMethod}.json`,
      ];
      let res: any;
      for (const path of possiblePaths) {
        const response = await fetch(path);
        const text = await response.text();
        if (
          text.trimStart().startsWith("{") ||
          text.trimStart().startsWith("[")
        ) {
          res = {
            demo: JSON.parse(text),
          };
          break;
        } else {
          continue;
        }
      }

      if (!res) {
        throw new Error(`Failed to fetch demo JSON for method: ${apiMethod}`);
      }
      return res;
    }
  } else {
    const fetchOptions: RequestInit = {
      method: options.method,
      headers: { ...headers },
      body: options.body ? options.body : undefined,
    };
    if (window.__TAURI__) {
      const { fetch } = await import("@tauri-apps/plugin-http");
      const response = await fetch(url, fetchOptions);
      return response;
    } else {
      const response = await fetch(url, fetchOptions);
      return response;
    }
  }
}
