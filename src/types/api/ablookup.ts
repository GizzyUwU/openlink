// ABLookup stands for AchievementBehaviourLookups containing codes for usage in Achievements and Behaviour API
import { ApiRequest, EdulinkApiResponse } from "../global";
export type ABLookupRequest = ApiRequest<
  "EduLink.AchievementBehaviourLookups",
  {}
>;

export interface achievementActivityTypes {
  id: string;
  description: string;
  active: boolean;
}

export interface achievementAwardTypes {
  id: string;
  name: string;
}

export interface achievementTypes {
  id: string;
  active: boolean;
  code: string;
  description: string;
  position: number;
  points: number;
  system: boolean;
}

export interface behaviourActionsTaken {
  id: string;
  name: string;
}

export interface behaviourActivityTypes {
  id: string;
  description: string;
  active: boolean;
}

export interface behaviourBullyingTypes {
  id: string;
  name: string;
}

export interface behaviourDetentionAttendance {
  code: string;
  description: string;
  absent: boolean;
}

export interface behaviourLocations {
  id: string;
  name: string;
}

export interface behaviourStatuses {
  id: string;
  name: string;
}

export interface behaviourTimes {
  id: string;
  name: string;
}

export interface behaviourTypes {
  id: string;
  active: boolean;
  code: string;
  description: string;
  position: number;
  points: number;
  detention_reason: boolean;
  system: boolean;
  is_bullying_type: boolean;
}

export type ABLookupResponse = EdulinkApiResponse<{
  method: "EduLink.AchievementBehaviourLookups";
  success: boolean;
  achievement_activity_types: achievementActivityTypes[];
  achievementAwardTypes: achievementActivityTypes[];
  achievement_hidden_fields_on_entry: string[];
  achievement_points_editable: boolean;
  achievement_require_fields: string[];
  achievement_types: achievementTypes[];
  behaviour_actions_taken: behaviourActionsTaken[];
  behaviour_activity_types: behaviourActivityTypes[];
  behaviour_bullying_types: behaviourBullyingTypes[];
  behaviour_detention_attendance: behaviourDetentionAttendance[];
  behaviour_hidden_fields_on_entry: string[];
  behaviour_locations: behaviourLocations[];
  behaviour_points_editable: boolean;
  behaviour_require_points: string[];
  behaviour_statuses: behaviourStatuses[];
  behaviour_times: behaviourTimes[];
  behaviour_types: behaviourTypes[];
  detentionmanagement_enabled: boolean;
  detentionmanagement_require_fields: string[];
}>;
