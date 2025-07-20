import { FromCodeRequest, FromCodeResponse, SchoolDetailsRequest, SchoolDetailsResponse } from "../types/auth";
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
    "http://127.0.0.1:3000/", // https://provisioning.edulinkone.com?method=School.FromCode
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

export async function schoolLookup(
  id: number,
  apiUrl: string | null = null,
): Promise<SchoolDetailsResponse> {
  if(!apiUrl) throw new Error("API URL is required for school lookup");
  if (!id) throw new Error("School ID is required for school lookup");
  const method = "EduLink.SchoolDetails";
  const requestBody: SchoolDetailsRequest = {
    jsonrpc: "2.0",
    method,
    params: { establishment_id: id.toString(), from_app: false },
    uuid: uuid(),
    id: "1",
  };

  const response = await fetch(
    apiUrl + "?method=" + method,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Method": method,
      },
      body: JSON.stringify(requestBody),
    },
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}
