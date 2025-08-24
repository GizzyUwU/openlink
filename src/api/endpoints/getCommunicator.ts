import {
  CommunicatorInboxRequest,
  InboxResponse,
  // OutboxResponse,
} from "../../types/api/communicator";
import { v4 as uuid } from "uuid";
import { callApi } from "../fetch";

export default {
  name: "getCommunicator",
  handler: async function (
    type: "inbox" | "outbox",
    page: number,
    per_page: number,
    key: string,
    serverUrl: string,
  ): Promise<InboxResponse> {
    if (!serverUrl)
      throw new Error("API URL is not set. Please find school api url.");
    if (!key) throw new Error("API key is not set. Please provide api key.");
    if (type === "inbox") {
      const method = "Communicator.Inbox";
      const requestBody: CommunicatorInboxRequest = {
        jsonrpc: "2.0",
        method,
        params: {
          page,
          per_page,
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
    } else {
      throw new Error("Not done yet.");
    }
  },
};
