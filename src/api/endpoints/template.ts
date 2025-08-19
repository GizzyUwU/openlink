// import { , } from "../../types/api/";
import { v4 as uuid } from "uuid";

export default {
  name: "template",
  handler: async function (
    learnerId: string,
    key: string,
    serverUrl?: string,
  ): Promise<any> {
    if (!serverUrl)
      throw new Error("API URL is not set. Please find school first.");
    if (!learnerId)
      throw new Error("Learner ID is required for timetable lookup");
    if (!key) throw new Error("API key is required for timetable lookup");
  },
};
