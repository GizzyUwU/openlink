import { ApiRequest, EdulinkApiResponse } from "../global";

type HomeworkParams = {
  format: number;
};

export type HomeworkRequest = ApiRequest<"EduLink.Homework", HomeworkParams>;

export interface Attachments {
  id: string | number;
  filename: string;
  filesize: string | number;
  mine_type: string;
  uploaded: boolean;
}

export interface Homework {
  id: string | number;
  activity: string;
  status: string;
  web_url: string;
  subject: string;
  due_date: string;
  due_reminder: string;
  available_date: string;
  completed: boolean;
  format: number;
  duration: string | number;
  cloneable: boolean;
  deletable: boolean;
  due_text: string;
  source: string;
  available_text: string;
  icon: string;
  attachments: Attachments[];
  class?: {
    display_name: string;
    description: string;
    external_name: string;
  };
}

export type HomeworkResponse = EdulinkApiResponse<{
  method: "EduLink.Homework";
  success: boolean;
  homework: {
    current: Homework[];
    past: Homework[];
  };
  hidden_fields: string[];
}>;

export namespace HomeworkResponse {
  export type Items = Homework;
}
