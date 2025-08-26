import { FormsRequest, FormsResponse } from "../../types/api/forms";
import { v4 as uuid } from "uuid";
import { callApi } from "../fetch";

export default {
  name: "getForms",
  handler: async function (
    forType: string,
    key: string,
    serverUrl: string,
  ): Promise<FormsResponse> {
    if (!serverUrl)
      throw new Error("API URL is not set. Please find school api url.");
    if (!key) throw new Error("API key is not set. Please provide api key.");
    const method = "EduLink.Forms";
    const requestBody: FormsRequest = {
      jsonrpc: "2.0",
      method,
      params: {
        for: forType,
      },
      uuid: uuid(),
      id: "1",
    };

    const response = await callApi(serverUrl + "?method=" + method, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Method": method,
        Authorization: `Bearer ${key}`,
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
