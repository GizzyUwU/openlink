import { ClubsRequest, ClubsResponse } from "../../types/api/clubs";
import { v4 as uuid } from "uuid";
import { callApi } from "../fetch";

export default {
  name: "getClubs",
  handler: async function (
    member: boolean,
    learner_id: string,
    key: string,
    serverUrl: string,
  ): Promise<ClubsResponse> {
    if (!serverUrl)
      throw new Error("API URL is not set. Please find school api url.");
    if (!learner_id)
      throw new Error("Learner ID is required for timetable lookup");
    if (!key) throw new Error("API key is not set. Please provide api key.");
    if (member === undefined || member === null) {
      member = true;
    }
    const method = "EduLink.Clubs";
    const requestBody: ClubsRequest = {
      jsonrpc: "2.0",
      method,
      params: {
        member,
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
