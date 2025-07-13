import { LoginResponse as User, FromCodeResponse } from "../types/auth";
import { findSchoolFromCode } from "./auth.ts";

export class EdulinkAPI {
  private user: User | null;
  private apiUrl: string | null;
  private schoolId: number | null;

  constructor() {
    this.user = null;
    this.apiUrl = null;
    this.schoolId = null;
  }

  async findSchoolFromCode(code: string): Promise<FromCodeResponse> {
    const data = await findSchoolFromCode(code);
    if (!data || !data.result) throw new Error("API sent no data");
    this.schoolId = data.result.school.id;
    this.apiUrl = data.result.school.server;
    return data;
  }
}
