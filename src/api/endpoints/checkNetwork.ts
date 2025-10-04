import { callApi } from "../fetch";

export default {
  name: "checkNetwork",
  handler: async function (): Promise<boolean> {
    const method = "EduLink.SchoolDetails";
    const requestBody: {
        jsonrpc: string;
        method: "EduLink.SchoolDetails";
        params: {
            from_app: boolean;
        }
        uuid: string;
        id: string;
    } = {
      jsonrpc: "2.0",
      method,
      params: { from_app: false },
      uuid: window.crypto.randomUUID(),
      id: "1",
    };

    const response = await callApi("https://www.edulinkone.com/api/" + "?method=" + method + "&networkCheck=true", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Method": method,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
       return false;
    }
    return true;
  },
};
