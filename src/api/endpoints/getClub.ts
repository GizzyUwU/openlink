import { ClubRequest, ClubResponse } from "../../types/api/clubs";
import { v4 as uuid } from "uuid";
import { callApi } from "../fetch";

export default {
  name: "getClub",
  handler: async function (
    club_id: string | number,
    key: string,
    serverUrl: string,
  ): Promise<ClubResponse> {
    if (!serverUrl)
      throw new Error("API URL is not set. Please find school api url.");
    if (!club_id)
      throw new Error("Learner ID is required for timetable lookup");
    if (!key) throw new Error("API key is not set. Please provide api key.");
    const method = "EduLink.Club";
    const requestBody: ClubRequest = {
      jsonrpc: "2.0",
      method,
      params: {
        club_id,
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
