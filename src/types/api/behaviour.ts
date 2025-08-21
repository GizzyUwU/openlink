import { ApiRequest, EdulinkApiResponse } from "../global";

type BehaviourParams = {
  learner_id: string;
  format: number;
};

export type BehaviourRequest = ApiRequest<"EduLink.Behaviour", BehaviourParams>;

export interface Detentions {
  attended: string;
  non_attendance_reason: string;
  id: string | number;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  date: string;
}

export interface Behaviour {
  id: string | number;
  source: string;
  types_id: string[] | number[];
  activity_id: string | number;
  date: string;
  bullying_type_id: string | number | null;
  location_id: string | number | null;
  action_taken: {
    id: string | number | null;
    date: string | null;
    employee_id: string | number | null;
  };
  points: number;
  lesson_information: string;
}

export interface Employees {
  id: string | number;
  title: string;
  forename: string;
  surname: string;
}

export type BehaviourResponse = EdulinkApiResponse<{
  method: "EduLink.Behaviour";
  success: boolean;
  detentions: Detentions[];
  behaviour: Behaviour[];
  employees: Employees[];
  hide_fields: string[];
}>;

export namespace BehaviourResponse {
  export type BehaviourType = Behaviour;
  export type DetentionsType = Detentions;
  export type EmployeesType = Employees;
}
