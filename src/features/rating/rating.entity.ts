/** Участник рейтинга (как он приходит с бэкенда). */
export interface RatingParticipant {
  id: string;
  /** Имя с инициалом — как в списках: «Иван И.» */
  name: string;
  /** Только имя — для узких колонок пьедестала: «Иван» */
  firstName: string;
  /** Очки за собранные объекты. */
  points: number;
  /** Текущий пользователь (его строка подсвечивается). */
  isMe?: boolean;
}

/** Снимок рейтинга на текущий момент. */
export interface RatingSnapshot {
  participants: RatingParticipant[];
  /** Подпись «когда обновлено» — пригодится, когда данные станут живыми. */
  updatedLabel: string;
}

/** Участник с посчитанным местом. */
export interface PlacedParticipant extends RatingParticipant {
  place: number;
}

/**
 * Расставить места по убыванию очков.
 * Место — это позиция в общем списке (1, 2, 3…), а не индекс массива.
 */
export function withPlaces(participants: RatingParticipant[]): PlacedParticipant[] {
  return [...participants]
    .sort((a, b) => b.points - a.points)
    .map((participant, index) => ({ ...participant, place: index + 1 }));
}

/** Тройка лидеров — на пьедестал её раскладывает экран. */
export function podiumParticipants(placed: PlacedParticipant[]): PlacedParticipant[] {
  return placed.slice(0, 3);
}
