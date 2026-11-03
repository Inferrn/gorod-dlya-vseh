import { RatingSnapshot } from "./rating.entity";

/**
 * Заглушка рейтинга — ровно те же люди и очки, что в макете.
 * Когда появится эндпоинт рейтинга, этот файл заменится на repository,
 * а экраны останутся прежними: они работают со снимком RatingSnapshot.
 */
export const RATING_MOCK: RatingSnapshot = {
  updatedLabel: "обновлено сегодня",
  participants: [
    { id: "u-01", name: "Иван И.", firstName: "Иван", points: 10_500 },
    { id: "u-02", name: "Сергей П.", firstName: "Сергей", points: 9_200 },
    { id: "u-03", name: "Екатерина Л.", firstName: "Екатерина", points: 8_700 },
    { id: "u-04", name: "Андрей С.", firstName: "Андрей", points: 7_800 },
    { id: "u-05", name: "Ирина К.", firstName: "Ирина", points: 6_500 },
    { id: "u-06", name: "Анна В.", firstName: "Анна", points: 5_900 },
    { id: "u-07", name: "Владимир Т.", firstName: "Владимир", points: 5_200 },
    { id: "u-08", name: "Лариса М.", firstName: "Лариса", points: 4_300 },
    { id: "u-09", name: "Антон Д.", firstName: "Антон", points: 3_000 },
    { id: "u-10", name: "Екатерина О.", firstName: "Екатерина", points: 2_100, isMe: true },
  ],
};
