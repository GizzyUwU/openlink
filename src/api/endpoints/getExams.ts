import { ExamsRequest, ExamsResponse } from "../../types/api/exams";
import { v4 as uuid } from "uuid";
import { callApi } from "../fetch";

export default {
  name: "getExams",
  handler: async function (
    learner_id: string,
    key: string,
    serverUrl: string,
  ): Promise<ExamsResponse> {
    if (!serverUrl)
      throw new Error("API URL is not set. Please find school api url.");
    if (!learner_id)
      throw new Error("Learner ID is required for timetable lookup");
    if (!key) throw new Error("API key is not set. Please provide api key.");
    const method = "EduLink.Exams";
    const requestBody: ExamsRequest = {
      jsonrpc: "2.0",
      method,
      params: {
        learner_id,
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
