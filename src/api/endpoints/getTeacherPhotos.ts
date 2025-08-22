import {
  TeacherPhotosRequest,
  TeacherPhotosResponse,
} from "../../types/api/teacherPhotos";
import { v4 as uuid } from "uuid";
import { callApi } from "../fetch";

export default {
  name: "getTeacherPhotos",
  handler: async function (
    employees: string | string[],
    key: string,
    serverUrl: string,
  ): Promise<TeacherPhotosResponse> {
    if (!serverUrl)
      throw new Error("API URL is not set. Please find school api url.");
    if (!key) throw new Error("API key is not set. Please provide api key.");
    const method = "EduLink.TeacherPhotos";
    const requestBody: TeacherPhotosRequest = {
      jsonrpc: "2.0",
      method,
      params: {
        employee_ids: Array.isArray(employees) ? employees : [employees],
        size: 160,
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
