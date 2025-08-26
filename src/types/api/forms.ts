import { ApiRequest, EdulinkApiResponse } from "../global";

export type FormsRequest = ApiRequest<
  "EduLink.Forms",
  {
    for: string;
  }
>;

export interface Form {
  id: string | number;
  subject: string;
  created: string;
  due: string;
  employee_id: string | number;
  learner_id: string | number;
  submitted: boolean | null;
  employees?: {
    total?: number;
    responses?: number;
  };
}

export type FormsResponse = EdulinkApiResponse<{
  method: "EduLink.Forms";
  success: boolean;
  forms: Form[];
}>;

export namespace FormsResponse {
  export type FormType = Form;
}
