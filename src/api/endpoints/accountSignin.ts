import { LoginRequest, LoginResponse } from "../../types/auth";
import { v4 as uuid } from "uuid";
import { callApi } from "../fetch";

export default {
  name: "accountSignin",
  handler: async function (
    username: string,
    password: string,
    schoolId: string,
    serverUrl: string,
  ): Promise<LoginResponse> {
    if (!serverUrl)
      throw new Error("API URL is not set. Please find school first.");
    if (!schoolId)
      throw new Error("School ID is not set. Please find school first.");
    if (!username)
      throw new Error("Username is not set. Please provide a username.");
    if (!password)
      throw new Error("Password is not set. Please provide a password.");

    const method = "EduLink.Login";

    const requestBody: LoginRequest = {
      jsonrpc: "2.0",
      method,
      params: {
        from_app: false,
        fcm_token_old: "",
        username,
        password,
        establishment_id: schoolId.toString(),
      },
      uuid: uuid(),
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
