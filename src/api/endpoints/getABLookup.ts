import { v4 as uuid } from "uuid";
import { ABLookupRequest, ABLookupResponse } from "../../types/api/ablookup";
import { callApi } from "../fetch";

/**
 * Pulls Achievemnt and Behaviour ID match data from API to use in both endpoints to match id's to content.
 *
 * @param {string} User authentication key.
 * @param {string} The url of the API.
 * @returns {ABLookupResponse} Returns ABLookup data.
 */

export default {
  name: "getABLookup",
  handler: async function (
    key: string,
    serverUrl?: string,
  ): Promise<ABLookupResponse> {
    if (!serverUrl)
      throw new Error("API URL is not set. Please find school first.");
    if (!key) throw new Error("API key is required for timetable lookup");
    const method = "EduLink.AchievementBehaviourLookups";
    const requestBody: ABLookupRequest = {
      jsonrpc: "2.0",
      method,
      params: {},
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
