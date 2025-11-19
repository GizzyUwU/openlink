import { LoginContextRequest, LoginResponse } from "../../types/auth";

import { callApi } from "../fetch";

export default {
  name: "loginContext",
  handler: async function (
    key: string,
    serverUrl: string,
  ): Promise<LoginResponse> {
    if (!serverUrl)
      throw new Error("API URL is not set. Please find school first.");
    if (!key) throw new Error("Auth Token is not set. Please pass auth token first.")

    const method = "EduLink.LoginContext";

    const requestBody: LoginContextRequest = {
      jsonrpc: "2.0",
      method,
      params: {
        from_app: false,
      },
      uuid: window.crypto.randomUUID(),
      id: "1",
    };

    const response = await callApi(serverUrl + "?method=" + method, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Method": method,
        Authorization: `Bearer ${key.replace(/^"|"$/g, "")}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (response.demo) {
      return response.demo;
    } else {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    }
  },
};
