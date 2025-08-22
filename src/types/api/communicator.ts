import { ApiRequest, EdulinkApiResponse } from "../global";

type CommunicatorParams = {
  page: number;
  per_page: number;
};

export type CommunicatorInboxRequest = ApiRequest<
  "Communicator.Inbox",
  CommunicatorParams
>;

export type CommunicatorOutboxRequest = ApiRequest<
  "Communicator.Outbox",
  CommunicatorParams
>;

export interface Attachments {
  id: string | number;
  filename: string;
  filesize: string | number;
  mine_type: string;
  uploaded: boolean;
}

export interface Messages {
  id: string | number;
  type: string;
  subject: string;
  body: string;
  date: string;
  read: string;
  sender: {
    id: string | number;
    type: string;
    name: string;
  };
  copied: {
    id: string | number;
    name: string;
    is_read: boolean;
    is_reply: boolean;
  };
  attachments: Attachments[];
  message_id: string | number;
}

export type InboxResponse = EdulinkApiResponse<{
  method: "Communicator.Inbox";
  success: boolean;
  messages: Messages[];
  pagination: {
    current_page: number | string;
    total_pages: number | string;
    total_records: number | string;
    next_page: number | string;
  };
}>;

export type OutboxResponse = EdulinkApiResponse<{
  method: "Communicator.Outbox";
  success: boolean;
  messages: Messages[];
  hidden_fields: string[];
}>;

export namespace CommunicatorResponse {
  export type MessagesType = Messages;
}
