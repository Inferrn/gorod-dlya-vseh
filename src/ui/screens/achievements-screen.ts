import { need } from "../shared/dom";
import sharpEyeImg from "../../../assets/sharp-eye.png";
import tactileDetectiveImg from "../../../assets/tactile-detective.png";
import navigatorImg from "../../../assets/navigator.png";
import photoFixImg from "../../../assets/photo-fix.png";
import guideImg from "../../../assets/guide.png";
import goldenRouletteImg from "../../../assets/golden-roulette.png";

interface AchievementItem {
  title: string;
  image: string;
  description: string;
}

const PAGE_1_ACHIEVEMENTS: AchievementItem[] = [
  {
    title: "Меткий глаз",
    image: sharpEyeImg,
    description: "Выдается за",
  },
  {
    title: "Тактильный детектив",
    image: tactileDetectiveImg,
    description: "Выдается за",
  },
  {
    title: "Навигатор доступности",
    image: navigatorImg,
    description: "Выдается за",
  },
  {
    title: "Фотофиксация на 5+",
    image: photoFixImg,
    description: "Выдается за",
  },
];

const PAGE_2_ACHIEVEMENTS: AchievementItem[] = [
  {
    title: "Проводник доступности",
    image: guideImg,
    description: "Выдается за",
  },
  {
    title: "Золотая рулетка",
    image: goldenRouletteImg,
    description: "Выдается за",
  },
];

const ARROW_RIGHT_SVG = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M4.5 12H19" />
  <path d="M13 5.5L19.5 12l-6.5 6.5" />
</svg>`;

const ARROW_LEFT_SVG = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M19.5 12H5" />
  <path d="M11 5.5L4.5 12l6.5 6.5" />
</svg>`;

export class AchievementsScreen {
  private readonly headEl: HTMLElement;
  private readonly listEl: HTMLUListElement;
  private page: 1 | 2 = 1;

  constructor() {
    this.headEl = need("#ach-head");
    this.listEl = need<HTMLUListElement>("#ach-list");
  }

  init(): void {
    this.render();
  }

  private setPage(page: 1 | 2): void {
    if (this.page === page) return;
    this.page = page;
    this.render();
  }

  private render(): void {
    if (this.page === 1) {
      this.headEl.innerHTML = `
        <h1 class="ach-title">Мои достижения</h1>
        <button class="ach-header-btn" type="button" id="ach-next" aria-label="Следующая страница достижений">
          ${ARROW_RIGHT_SVG}
        </button>
      `;
      this.headEl.querySelector("#ach-next")?.addEventListener("click", () => {
        this.setPage(2);
      });
      this.renderItems(PAGE_1_ACHIEVEMENTS);
    } else {
      this.headEl.innerHTML = `
        <button class="ach-header-btn" type="button" id="ach-prev" aria-label="Назад к первой странице достижений">
          ${ARROW_LEFT_SVG}
          <span>Назад</span>
        </button>
      `;
      this.headEl.querySelector("#ach-prev")?.addEventListener("click", () => {
        this.setPage(1);
      });
      this.renderItems(PAGE_2_ACHIEVEMENTS);
    }
  }

  private renderItems(items: AchievementItem[]): void {
    this.listEl.innerHTML = "";
    for (const item of items) {
      const li = document.createElement("li");
      li.className = "ach-item";

      const badge = document.createElement("div");
      badge.className = "ach-badge";

      const img = document.createElement("img");
      img.src = item.image;
      img.alt = item.title;
      badge.appendChild(img);

      const desc = document.createElement("span");
      desc.className = "ach-desc";
      desc.textContent = item.description;

      li.append(badge, desc);
      this.listEl.appendChild(li);
    }
  }
}
