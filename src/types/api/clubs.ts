import { ApiRequest, EdulinkApiResponse } from "../global";

export type ClubsRequest = ApiRequest<
  "EduLink.Clubs",
  {
    member: boolean;
    learner_id: string | number;
  }
>;

export type ClubRequest = ApiRequest<
  "EduLink.Club",
  {
    club_id: number | string;
  }
>;

export type AttendClubRequest = ApiRequest<
  "EduLink.ClubAttending",
  {
    club_id: number | string;
    learner_id: string | number;
    attending: boolean;
  }
>;

export interface Session {
  id: number | string;
  start_time: string;
  end_time: string;
  register_employee_id: string | number;
  attended: boolean;
}

export interface Club {
  id: string | number;
  name: string;
  description: string;
  capacity: {
    maximum: number;
    bookings: number;
  };
  location: string;
  next_session: string;
  learners?: { learner_id: string | number }[];
  leaders?: { id: string | number }[];
  leaders_names?: string | string[];
  sessions?: Session[];
}

export type ClubsResponse = EdulinkApiResponse<{
  method: "EduLink.Clubs";
  success: boolean;
  clubs: Club[];
}>;

export type ClubResponse = EdulinkApiResponse<{
  method: "EduLink.Club";
  success: boolean;
  clubs: Club;
}>;

export type AttendClubResponse = EdulinkApiResponse<{
  method: "EduLink.ClubAttending";
  success: boolean;
  attending: boolean;
}>;

export namespace ClubsResponse {
  export type ClubType = Club;
}
