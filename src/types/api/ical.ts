import { ApiRequest, EdulinkApiResponse } from "../global";

export type ICalRequest = ApiRequest<"EduLink.ICalendars", {}>;

export interface Exports{
  personal: {
    type: string;
    description: string;
    enabled: boolean;
    url: string;
  }[];
  children: {
    type: string;
    description: string;
    enabled: boolean;
    url: string;
  }[]
}


export interface Imports{
  id: number | string;
  description: string;
  owner: string;
  url: string;
  fetcH_completed: string;
  user_types: string[] | string;
}


export type ICalResponse = EdulinkApiResponse<{
  method: "EduLink.ICalendars";
  success: boolean;
  exports: Exports[];
  imports: Imports[];
}>;

export namespace ICalResponse {
  export type ExportsType = Exports;
  export type importsType = Imports;
}
