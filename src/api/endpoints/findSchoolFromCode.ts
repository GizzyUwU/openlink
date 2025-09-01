import { v4 as uuid } from "uuid";
import { FromCodeRequest, FromCodeResponse } from "../../types/auth";
import { callApi } from "../fetch";

export default {
  name: "findSchoolFromCode",
  handler: async function (code: string): Promise<FromCodeResponse> {
    if (!code) throw new Error("School code is required for school lookup");

    const requestBody: FromCodeRequest = {
      jsonrpc: "2.0",
      method: "School.FromCode",
      params: { code },
      uuid: uuid(),
      id: "1",
    };

    const response = await callApi(
      "https://provisioning.edulinkone.com/?method=School.FromCode",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

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
