import { SchoolDetailsRequest, SchoolDetailsResponse } from "../../types/auth";
import { v4 as uuid } from "uuid";
import { callApi } from "../fetch";

export default {
  name: "schoolLookup",
  handler: async function (
    schoolId: string,
    serverUrl: string,
  ): Promise<SchoolDetailsResponse> {
    if (!serverUrl) throw new Error("API URL is required for school lookup");
    if (!schoolId) throw new Error("School ID is required for school lookup");

    const method = "EduLink.SchoolDetails";
    const requestBody: SchoolDetailsRequest = {
      jsonrpc: "2.0",
      method,
      params: { establishment_id: schoolId.toString(), from_app: false },
      uuid: uuid(),
      id: "1",
    };

    const response = await callApi(serverUrl + "?method=" + method, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Method": method,
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
