import { DocumentRequest, DocumentResponse } from "../../types/api/documents";
import { v4 as uuid } from "uuid";
import { callApi } from "../fetch";

/**
 * Pulls Document data from a identifier
 *
 * @param {string} Attachment Identifier (file_name)
 * @param {string | number} Document Identifier
 * @param {string} Authentication key
 * @param {string} The url of the API.
 * @returns {DocumentResponse} Returns document data.
 */

export default {
  name: "getDocument",
  handler: async function (
    attachment_identifier: string,
    document_id: string | number,
    key: string,
    serverUrl?: string,
  ): Promise<DocumentResponse> {
    if (!serverUrl)
      throw new Error("API URL is not set. Please find school first.");
    if (!attachment_identifier)
      throw new Error("Attachment Identifier is required for document lookup");
    if (!document_id)
      throw new Error("Document Identifier is required for document lookup");
    if (!key) throw new Error("API key is required for documents lookup");
    const method = "EduLink.Document";
    const requestBody: DocumentRequest = {
      jsonrpc: "2.0",
      method,
      params: {
        attachment_identifier,
        document_id,
        format: 2,
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
