import { AttendClubRequest, AttendClubResponse } from "../../types/api/clubs";
import { v4 as uuid } from "uuid";
import { callApi } from "../fetch";

export default {
  name: "attendClub",
  handler: async function (
    club_id: string | number,
    learner_id: string | number,
    attending: boolean,
    key: string,
    serverUrl: string,
  ): Promise<AttendClubResponse> {
    if (!serverUrl)
      throw new Error("API URL is not set. Please find school api url.");
    if (!club_id) throw new Error("Club ID is required for api endpoint");
    if (!learner_id)
      throw new Error("Learner ID is required for the api endpoint");
    if (attending === undefined || attending === null)
      throw new Error("Attend Bool required to either leave or join the club");
    if (!key) throw new Error("API key is not set. Please provide api key.");
    const method = "EduLink.ClubAttending";
    const requestBody: AttendClubRequest = {
      jsonrpc: "2.0",
      method,
      params: {
        club_id,
        learner_id,
        attending,
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
