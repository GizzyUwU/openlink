
import { FromCodeRequest, FromCodeResponse } from "../../types/auth";
import { callApi } from "../fetch";
import { ToastContextType } from "../../components/toast";

export default {
  name: "findSchoolFromCode",
  handler: async function (code: string, toast?: ToastContextType): Promise<FromCodeResponse> {
    if (!code) throw new Error("School code is required for school lookup");

    const requestBody: FromCodeRequest = {
      jsonrpc: "2.0",
      method: "School.FromCode",
      params: { code: "0" },
      uuid: window.crypto.randomUUID(),
      id: "1",
    };
    console.log(toast)
    const response = await callApi(
      "https://provisioning.edulinkone.com/?method=School.FromCode",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }, toast
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
