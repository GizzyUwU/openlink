import { ApiRequest, EdulinkApiResponse } from "../global";

type AttendanceParams = {
  learner_id: string | number;
  format: number;
};

export type AttendanceRequest = ApiRequest<
  "EduLink.Attendance",
  AttendanceParams
>;

export interface Exception {
  date: string;
  description: string;
  type: string;
  period: string;
}

export interface Statutory {
  month: string;
  values: {
    present: number;
    unauthorised: number;
    absent: number;
  };
  exceptions: Exception[];
}

export interface Lesson {
  subject: string;
  values: {
    present: number;
    unauthorised: number;
    absent: number;
    late: number;
  };
}

export interface TodaySession {
  session_mark_code: string;
  minutes_late: number;
  date: string;
  session: string;
  mark: {
    code: string;
    active: boolean;
    name: string;
    type: string;
    is_authorised_absence: boolean;
    is_statistical: boolean;
    is_late: boolean;
    present: boolean;
  };
}

export type AttendanceResponse = EdulinkApiResponse<{
  method: "EduLink.Attendance";
  success: boolean;
  show_lesson: boolean;
  show_statutory: boolean;
  show_today: boolean;
  lesson: Lesson[];
  statutory: Statutory[];
  today?: {
    sessions: TodaySession[];
  };
}>;

export namespace AttendanceResponse {
  export type LessonType = Lesson;
  export type StatutoryType = Statutory;
  export type SessionsType = TodaySession;
}
