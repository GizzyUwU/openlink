import { BehaviourRequest, BehaviourResponse } from "../../types/api/behaviour";
import { v4 as uuid } from "uuid";
import { callApi } from "../fetch";

/**
 * Pulls Behaviour Data from the API.
 *
 * @param {string | number} LearnerId for user lookup.
 * @param {string} Authentication key.
 * @param {string} The url of the API.
 * @returns {BehaviourResponse} Returns learner behaviour data.
 */

export default {
  name: "getBehaviour",
  handler: async function (
    learnerId: string,
    key: string,
    serverUrl?: string,
  ): Promise<BehaviourResponse> {
    if (!serverUrl)
      throw new Error("API URL is not set. Please find school first.");
    if (!learnerId)
      throw new Error("Learner ID is required for timetable lookup");
    if (!key) throw new Error("API key is required for timetable lookup");
    const method = "EduLink.Behaviour";
    const requestBody: BehaviourRequest = {
      jsonrpc: "2.0",
      method,
      params: {
        learner_id: learnerId,
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
