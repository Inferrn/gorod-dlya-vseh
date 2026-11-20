/**
 * ============================================================================
 *  bottom-nav.ts — нижнее меню «Карта · Добавить · Профиль»
 * ============================================================================
 *
 *  Меню одно на всё приложение: его не пересоздают при смене экрана, а только
 *  переводят активную вкладку. Поэтому это отдельный класс, а не кусок
 *  разметки внутри каждого экрана.
 *
 *  О вкладке «Профиль»: экрана профиля в макетах нет (16 кадров — карта,
 *  форма и подсказки), поэтому вкладка пока неактивна и показывает тост.
 * ============================================================================
 */

import { icon } from "./icons";

export type NavTab = "map" | "add" | "profile";

interface TabConfig {
  key: NavTab;
  label: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { key: "map", label: "Карта", icon: "map" },
  { key: "add", label: "Добавить", icon: "pencil" },
  { key: "profile", label: "Профиль", icon: "user" },
];

export class BottomNav {
  readonly root: HTMLElement;

  constructor(
    private readonly onSelect: (tab: NavTab) => void,
    active: NavTab = "map",
  ) {
    this.root = document.createElement("nav");
    this.root.className = "bottom-nav";
    this.root.setAttribute("aria-label", "Основная навигация");
    this.root.innerHTML = TABS.map(
      (tab) => `
        <button class="bottom-nav__item" type="button" role="tab"
                data-tab="${tab.key}" aria-selected="${tab.key === active}">
          ${icon(tab.icon, 24)}
          <span>${tab.label}</span>
        </button>`,
    ).join("");

    this.root.addEventListener("click", (event) => {
      const btn = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-tab]");
      if (!btn) return;
      this.onSelect(btn.dataset.tab as NavTab);
    });
  }

  /** Подсветить вкладку. Вызывается при каждой смене экрана. */
  setActive(tab: NavTab): void {
    this.root.querySelectorAll<HTMLElement>("[data-tab]").forEach((btn) => {
      btn.setAttribute("aria-selected", String(btn.dataset.tab === tab));
    });
  }
}
