import { LoginFromIDPRequest, LoginResponse } from "../../types/auth";

import { callApi } from "../fetch";

export default {
  name: "loginFromIDP",
  handler: async function (
    idpToken: string,
    serverUrl?: string,
  ): Promise<LoginResponse> {
    if (!serverUrl)
      throw new Error("API URL is not set. Please find school first.");
    if (!idpToken) throw new Error("IDP Url needed first.");

    const method = "EduLink.LoginFromIDP";

    const requestBody: LoginFromIDPRequest = {
      jsonrpc: "2.0",
      method,
      params: {
        from_app: false,
        fcm_token_old: "",
        token: idpToken,
      },
      uuid: window.crypto.randomUUID(),
      id: "1",
    };

    const response = await callApi(serverUrl + "?method=" + method, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Method": method,
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
