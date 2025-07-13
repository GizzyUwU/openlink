import { FromCodeRequest, FromCodeResponse } from "../types/auth";
import { v4 as uuid } from "uuid";

export async function findSchoolFromCode(
  code: string,
): Promise<FromCodeResponse> {
  const requestBody: FromCodeRequest = {
    jsonrpc: "2.0",
    method: "School.FromCode",
    params: { code },
    uuid: uuid(),
    id: "1",
  };

  const response = await fetch(
    "https://provisioning.edulinkone.com?method=School.FromCode",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    },
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}
