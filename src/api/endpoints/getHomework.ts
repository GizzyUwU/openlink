import { HomeworkRequest, HomeworkResponse } from "../../types/api/homework";
import { v4 as uuid } from "uuid";
import { callApi } from "../fetch";

/**
 * Pulls set Homework data from the API.
 *
 * @param {string} Authentication key.
 * @param {string} The url of the API.
 * @returns {HomeworkResponse} Returns learner behaviour data.
 */

export default {
  name: "getHomework",
  handler: async function (
    key: string,
    serverUrl?: string,
  ): Promise<HomeworkResponse> {
    if (!serverUrl)
      throw new Error("API URL is not set. Please find school first.");
    if (!key) throw new Error("API key is required for documents lookup");
    const method = "EduLink.Homework";
    const requestBody: HomeworkRequest = {
      jsonrpc: "2.0",
      method,
      params: {
        format: 2,
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
