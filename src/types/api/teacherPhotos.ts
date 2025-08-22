import { ApiRequest, EdulinkApiResponse } from "../global";

type TeacherPhotosParams = {
  size: number;
  employee_ids: string[] | number[];
};

export type TeacherPhotosRequest = ApiRequest<
  "EduLink.TeacherPhotos",
  TeacherPhotosParams
>;

export interface Photo {
  photo: string;
  id: string | number;
  cache: "string";
}

export type TeacherPhotosResponse = EdulinkApiResponse<{
  method: "EduLink.TeacherPhotos";
  success: boolean;
  employee_photos: Photo[];
}>;

export namespace TeacherPhotosResponse {
  export type PhotoType = Photo;
}
