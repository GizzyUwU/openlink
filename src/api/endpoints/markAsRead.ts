import { CommunicatorMarkRead, MarkReadResponse } from "../../types/api/communicator";
import { v4 as uuid } from "uuid";
import { callApi } from "../fetch";

export default {
    name: "markAsRead",
    handler: async function (
        message_id: string | number,
        key: string,
        serverUrl: string,
    ): Promise<MarkReadResponse> {
        if (!serverUrl)
            throw new Error("API URL is not set. Please find school api url.");
        if (!key)
            throw new Error("API key is not set. Please provide api key.");
        if (!message_id)
            throw new Error("Message ID is required to mark it as read.");
        const method = "Communicator.MessageMarkRead";
        const requestBody: CommunicatorMarkRead = {
            jsonrpc: "2.0",
            method,
            params: {
                message_id,
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
