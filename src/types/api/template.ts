import { ApiRequest, EdulinkApiResponse } from "../global";

export type LinksRequest = ApiRequest<"EduLink.Template", {}>;

export interface Template {
  id: string | number;
}

export type TemplateResponse = EdulinkApiResponse<{
  method: "EduLink.Template";
  success: boolean;
  links: Template[];
}>;

export namespace TemplateResponse {
  export type TemplateType = Template;
}
