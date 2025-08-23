import {
  AttendanceRequest,
  AttendanceResponse,
} from "../../types/api/attendance";
import { v4 as uuid } from "uuid";
import { callApi } from "../fetch";

export default {
  name: "getAttendance",
  handler: async function (
    learnerId: string,
    key: string,
    serverUrl: string,
  ): Promise<AttendanceResponse> {
    if (!serverUrl)
      throw new Error("API URL is not set. Please find school api url.");
    if (!key) throw new Error("API key is not set. Please provide api key.");
    if (!learnerId)
      throw new Error("Learner ID is required for timetable lookup");
    const method = "EduLink.Attendance";
    const requestBody: AttendanceRequest = {
      jsonrpc: "2.0",
      method,
      params: {
        learner_id: learnerId,
        format: 3,
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
