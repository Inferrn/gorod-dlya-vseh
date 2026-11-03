/**
 * Публичный API фичи «Рейтинг».
 * Экраны импортируют только отсюда — как и у ramp/crossing/road.
 */
export { withPlaces, podiumParticipants } from "./rating.entity";
export type {
  RatingParticipant,
  RatingSnapshot,
  PlacedParticipant,
} from "./rating.entity";
export { RATING_MOCK } from "./rating.mock";
