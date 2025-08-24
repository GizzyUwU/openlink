import { ApiRequest, EdulinkApiResponse } from "../global";

export type LinksRequest = ApiRequest<"EduLink.ExternalLinks", {}>;

export interface Links {
  id: string | number;
  name: string;
  url: string;
  icon: string;
}

export type LinksResponse = EdulinkApiResponse<{
  method: "EduLink.ExternalLinks";
  success: boolean;
  links: Links[];
}>;

export namespace LinksResponse {
  export type LinksType = Links;
}
