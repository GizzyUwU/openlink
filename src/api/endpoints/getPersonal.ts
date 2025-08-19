import { PersonalRequest, PersonalResponse } from "../../types/api/personal";
import { v4 as uuid } from "uuid";
import { callApi } from "../fetch";

export default {
  name: "getPersonal",
  handler: async function (
    learnerId: string,
    key: string,
    serverUrl?: string,
  ): Promise<PersonalResponse> {
    if (!serverUrl)
      throw new Error("API URL is not set. Please find school first.");
    if (!learnerId)
      throw new Error("Learner ID is required for personal lookup");
    if (!key) throw new Error("API key is required for personal lookup");

    const method = "EduLink.Personal";
    const requestBody: PersonalRequest = {
      jsonrpc: "2.0",
      method,
      params: { learner_id: learnerId },
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
