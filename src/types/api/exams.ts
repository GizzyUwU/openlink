import { ApiRequest, EdulinkApiResponse } from "../global";

export type ExamsRequest = ApiRequest<
  "EduLink.Exams",
  {
    learner_id: string | number;
  }
>;

export interface Entry {
  season: string;
  board: string;
  level: string;
  code: string | number;
  title: string;
}

export interface Result {
  date: string;
  board: string;
  level: string;
  code: string | number;
  title: string;
  result: string;
  equivalent: string;
  certificate: string;
}

export interface Timetable {
  datetime: string;
  board: string;
  level: string;
  code: string | number;
  title: string;
  room: string;
  seat: string;
  duration: string;
}

export type ExamsResponse = EdulinkApiResponse<{
  method: "EduLink.Exams";
  success: boolean;
  countdown: {
    minutes_to_go: number | string;
    exam: string;
    template: string;
  };
  entries: Entry[];
  results: Result[];
  timetable: Timetable[];
  show_countdown: boolean;
  show_entries: boolean;
  show_results: boolean;
  show_timetable: boolean;
}>;

export namespace ExamsResponse {
  export type EntryType = Entry;
  export type ResultType = Result;
  export type TimetableType = Timetable;
}
