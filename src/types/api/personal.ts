import { ApiRequest, EdulinkApiResponse } from "../global";

type PersonalParams = {
  learner_id: string;
};

export type PersonalRequest = ApiRequest<"EduLink.Personal", PersonalParams>;

export interface Personal {
  id: string | number | null;
  status: string | null;
  forename: string | null;
  surname: string | null;
  gender: string | null;
  admission_number: string | number | null;
  unique_pupil_number: string | null;
  unique_learner_number: string | number | null;
  date_of_birth: string | null;
  admission_date: string | null;
  email: string | null;
  phone: string[] | string | number[] | number | null;
  mobile_phone: string[] | string | number[] | number | null;
  address: string | null;
  post_code: string | null;
  pronoun_id: string | number | null;
  personal_pronouns: string | null;
  form_group?: {
    id: string | number | null;
    name: string | null;
    room: {
      id: string | number | null;
      code: string | null;
      name: string | null;
    };
    employee: {
      id: string | number | null;
      title: string | null;
      forename: string | null;
      surname: string | null;
    };
  };
  house_group?: {
    id: string | number | null;
    name: string | null;
  };
  year_group?: {
    id: string | number | null;
    name: string | null;
  };
  exam_candidate_number: string | number | null;
}

export type PersonalResponse = EdulinkApiResponse<{
  method: "EduLink.Personal";
  success: boolean;
  personal: Personal;
}>;
