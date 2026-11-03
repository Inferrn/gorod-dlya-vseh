/**
 * ============================================================================
 *  rating.render.ts — сборка DOM трёх видов рейтинга
 * ============================================================================
 *  Только разметка, без поведения: экран (rating-screen.ts) решает, когда
 *  показать вид и какие анимации запустить. Так разметку легко править,
 *  не трогая логику переключения.
 * ============================================================================
 */

import { PlacedParticipant, podiumParticipants } from "../../features/rating";
import { formatPoints } from "../shared/format";

/** Человечек в аватаре. Обрезается кругом .avatar — как в макете. */
const AVATAR_SVG = `
<svg viewBox="0 0 44 44" fill="none" stroke="#eda324" stroke-width="1.6"
     stroke-linecap="round" aria-hidden="true">
  <circle cx="22" cy="16.4" r="5.4" />
  <path d="M8 41c0-7.7 6.3-13.2 14-13.2S36 33.3 36 41" />
</svg>`;

function avatar(): HTMLSpanElement {
  const element = document.createElement("span");
  element.className = "avatar";
  element.innerHTML = AVATAR_SVG;
  return element;
}

function badge(place: number): HTMLSpanElement {
  const element = document.createElement("span");
  element.className = "rank-badge";
  if (place <= 3) element.classList.add("rank-badge--top");
  element.textContent = String(place);
  element.setAttribute("aria-label", `${place} место`);
  return element;
}

function name(participant: PlacedParticipant): HTMLSpanElement {
  const element = document.createElement("span");
  element.className = "rank-name";
  element.textContent = participant.name;
  return element;
}

function points(participant: PlacedParticipant): HTMLSpanElement {
  const element = document.createElement("span");
  element.className = "rank-points js-points";
  element.dataset.value = String(participant.points);
  element.textContent = formatPoints(participant.points);
  return element;
}

/**
 * Строка списка.
 * @param variant "table" — без номеров, но с аватарами у топ-3;
 *                "list"  — с номерами мест, как в «Рейтинге участников».
 */
function row(
  participant: PlacedParticipant,
  variant: "table" | "list",
  index: number,
): HTMLLIElement {
  const element = document.createElement("li");
  element.className = "rank-row";
  if (participant.place <= 3) element.classList.add("rank-row--top");
  if (participant.isMe) element.classList.add("rank-row--me");
  element.style.setProperty("--i", String(index));

  if (variant === "list") element.append(badge(participant.place));
  if (participant.place <= 3) element.append(avatar());

  element.append(name(participant), points(participant));
  return element;
}

function card(participants: PlacedParticipant[], variant: "table" | "list"): HTMLElement {
  const cardElement = document.createElement("div");
  cardElement.className = `rating-card rating-card--${variant}`;

  const list = document.createElement("ul");
  list.className = "rank-list";

  participants.forEach((participant, index) => {
    list.append(row(participant, variant, index));
  });

  cardElement.append(list);
  return cardElement;
}

/** Вид «Таблица рейтинга» (макет 1). */
export function buildTableView(participants: PlacedParticipant[]): HTMLElement {
  return card(participants, "table");
}

/** Вид «Рейтинг участников» (макет 3). */
export function buildListView(participants: PlacedParticipant[]): HTMLElement {
  return card(participants, "list");
}

/** Высота колонны пьедестала: лидер — 220px, остальные — по очкам. */
function barHeight(points: number, maxPoints: number): number {
  const ratio = maxPoints > 0 ? points / maxPoints : 1;
  return Math.round(220 * (0.35 + 0.65 * ratio * ratio));
}

/**
 * Вид «Пьедестал» (макет 2).
 * Колонны стоят как 2 — 1 — 3, растут вверх и упираются в общую линию.
 */
export function buildPodiumView(participants: PlacedParticipant[]): HTMLElement {
  const stage = document.createElement("div");
  stage.className = "podium-stage";

  const top = podiumParticipants(participants);
  const leader = top[0];
  const maxPoints = leader ? leader.points : 1;

  // Порядок в разметке: второе место, первое, третье — как на макете.
  const order: PlacedParticipant[] = [];
  if (top[1]) order.push(top[1]);
  if (top[0]) order.push(top[0]);
  if (top[2]) order.push(top[2]);

  const delays: Record<number, number> = { 1: 0, 2: 120, 3: 240 };

  for (const participant of order) {
    const column = document.createElement("div");
    column.className = `podium-col podium-col--${participant.place}`;
    column.style.setProperty("--bar", `${barHeight(participant.points, maxPoints)}px`);
    column.style.setProperty("--delay", `${delays[participant.place] ?? 0}ms`);

    const bar = document.createElement("div");
    bar.className = "podium-bar";

    const barName = document.createElement("span");
    barName.className = "podium-name";
    barName.textContent = participant.firstName;
    bar.append(barName);

    const rank = document.createElement("span");
    rank.className = "podium-rank";
    rank.textContent = String(participant.place);
    rank.setAttribute("aria-label", `${participant.place} место`);

    const score = document.createElement("span");
    score.className = "podium-points js-points";
    score.dataset.value = String(participant.points);
    score.textContent = formatPoints(participant.points);

    column.append(bar, rank, score);
    stage.append(column);
  }

  return stage;
}
