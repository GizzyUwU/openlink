import { ApiRequest, EdulinkApiResponse } from "../global";

type DocumentsParams = {
  learner_id: string;
  format: number;
}

export type DocumentsRequest = ApiRequest<"EduLink.Documents", DocumentsParams>;

export interface Attachments {
  identifer: string;
  name: string;
}

export interface Documents {
  id: string;
  type: string;
  summary: string;
  comments: string;
  status_code: string;
  date: string;
  attachments: Attachments[];
}

export type DocumentsResponse = EdulinkApiResponse<{
  method: "EduLink.Documents";
  success: boolean;
  documents: Documents[];
}>;
