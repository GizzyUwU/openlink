import { 
  FromCodeRequest,
  FromCodeResponse,
  SchoolDetailsRequest,
  SchoolDetailsResponse,
  LoginResponse as User,
  StatusRequest,
  StatusResponse,
  LoginRequest
} from "../types/auth";
import  { TimetableRequest, TimetableResponse } from "../types/api/timetable";
import { v4 as uuid } from "uuid";
import { DocumentsRequest, DocumentsResponse } from "../types/api/documents";

export class EdulinkAPI {
  private apiUrl: string | null;
  private schoolId: number | null;

  constructor() {
    this.apiUrl = null;
    this.schoolId = null;
  }

  async findSchoolFromCode(
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
      "http://127.0.0.1:3000/?method=School.FromCode", // https://provisioning.edulinkone.com?method=School.FromCode"
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Method": "School.FromCode",
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.result.success) {
      this.schoolId = data.result.school.id;
      this.apiUrl = data.result.school.server;
    }

    return data;
  }

  async schoolLookup(
    id?: number,
    apiUrl?: string,
  ): Promise<SchoolDetailsResponse> {
    const schoolId = id || this.schoolId;
    const serverUrl = apiUrl || this.apiUrl;

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

    const response = await fetch(
      serverUrl + "?method=" + method,
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

  async accountSignIn(username: string, password: string, id?: string, apiUrl?: string): Promise<User> {
    const schoolId = id || this.schoolId;
    const serverUrl = apiUrl || this.apiUrl;
    if (!serverUrl) throw new Error("API URL is not set. Please find school first.");
    if (!schoolId) throw new Error("School ID is not set. Please find school first.");

    const method = "EduLink.Login";

    const requestBody: LoginRequest = {
      jsonrpc: "2.0",
      method,
      params: {
        from_app: false,
        fcm_token_old: "",
        username,
        password,
        establishment_id: schoolId.toString(),
      },
      uuid: uuid(),
      id: "1",
    };

    const response = await fetch(
      serverUrl + "?method=" + method,
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

  async getStatus(key: string, apiUrl?: string): Promise<StatusResponse> {
    const serverUrl = apiUrl || this.apiUrl;
    if (!serverUrl) throw new Error("API URL is not set. Please find school first.");

    const method = "EduLink.Status";
    const requestBody: StatusRequest = {
      jsonrpc: "2.0",
      method,
      params: {
        last_visible: 0,
        format: 2,
      },
      uuid: uuid(),
      id: "1",
    };

    const response = await fetch(
      serverUrl + "?method=" + method,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Method": method,
          "Authorization": `Bearer ${key}`,
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async getTimetable(learnerId: string, key: string, apiUrl?: string): Promise<TimetableResponse> {
    const serverUrl = apiUrl || this.apiUrl;
    if (!serverUrl) throw new Error("API URL is not set. Please find school first.");
    if (!learnerId) throw new Error("Learner ID is required for timetable lookup");
    if (!key) throw new Error("API key is required for timetable lookup");
    const method = "EduLink.Timetable";
    const requestBody: TimetableRequest = {
      jsonrpc: "2.0",
      method,
      params: {
        date: new Date().toISOString().split('T')[0],
        learner_id: learnerId,
        format: 2,
      },
      uuid: uuid(),
      id: "1",
    };
    const response = await fetch(
      serverUrl + "?method=" + method,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Method": method,
          "Authorization": `Bearer ${key}`,
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async getDocuments(learnerId: string, key: string, apiUrl?: string): Promise<DocumentsResponse> {
    const serverUrl = apiUrl || this.apiUrl;
    if (!serverUrl) throw new Error("API URL is not set. Please find school first.");
    if (!learnerId) throw new Error("Learner ID is required for documents lookup");
    if (!key) throw new Error("API key is required for documents lookup");
    const method = "EduLink.Documents";
    const requestBody: DocumentsRequest = {
      jsonrpc: "2.0",
      method,
      params: {
        learner_id: learnerId,
        format: 2,
      },
      uuid: uuid(),
      id: "1",
    };
    const response = await fetch(
      serverUrl + "?method=" + method,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Method": method,
          "Authorization": `Bearer ${key}`,
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }
}