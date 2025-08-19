import { ApiRequest, EdulinkApiResponse } from "../global";

type AchievementParams = {
  learner_id: string;
};

export type AchievementRequest = ApiRequest<
  "EduLink.Achievement",
  AchievementParams
>;

export interface Achievement {
  id: string | number;
  source: string;
  types_id: string[] | number[];
  activity_id: string | number;
  date: string;
  recorded: {
    employee_id: string | number;
  };
  award?: {
    id: string | number;
    date: string;
  };
  comments: string;
  points: number | string;
  lesson_information: string;
}

export interface Employees {
  id: string | number;
  title: string;
  forename: string;
  surname: string;
}

export type AchievementResponse = EdulinkApiResponse<{
  method: "EduLink.Achievement";
  success: boolean;
  achievement: Achievement[];
  employees: Employees[];
  hide_fields: string[];
}>;
