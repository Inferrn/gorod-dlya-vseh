import "./auth.css";

type AuthStep = "phone" | "code";

export interface AuthScreenOptions {
  onSuccess: (phone: string) => void;
  sendCode?: (phone: string) => Promise<void>;
  verifyCode?: (phone: string, code: string) => Promise<boolean>;
}

export class AuthScreen {
  private root: HTMLElement;
  private step: AuthStep = "phone";
  private phone = "";
  private code = "";
  private timerSec = 57;
  private timerId: number | null = null;
  private errorText = "";
  private isResending = false;

  constructor(
    private container: HTMLElement,
    private options: AuthScreenOptions,
  ) {
    this.root = document.createElement("div");
    this.root.className = "auth-overlay";
    this.container.appendChild(this.root);
    this.render();
  }

  destroy() {
    this.stopTimer();
    this.root.remove();
  }

  private render() {
    this.root.innerHTML = "";
    if (this.step === "phone") {
      this.renderPhone();
    } else {
      this.renderCode();
    }
  }

  private renderPhone() {
    this.root.innerHTML = `
      <div class="auth-header">
        <button class="auth-back" type="button" aria-label="Назад">←</button>
      </div>
      <div class="auth-body">
        <h1 class="auth-title">Вход</h1>
        <input
          class="auth-phone-input"
          type="tel"
          inputmode="tel"
          placeholder="+7 (___) ___-__-__"
          value="${this.phone}"
          maxlength="18"
        />
        <button class="auth-btn" type="button">Далее</button>
      </div>
    `;

    const input = this.root.querySelector(".auth-phone-input") as HTMLInputElement;
    const btn = this.root.querySelector(".auth-btn") as HTMLButtonElement;

    input.focus();

    input.addEventListener("input", () => {
      this.phone = this.formatPhone(input.value);
      input.value = this.phone;
    });

    btn.addEventListener("click", () => this.onPhoneNext());
  }

  private async onPhoneNext() {
    const digits = this.phone.replace(/\D/g, "");
    if (digits.length < 11) {
      alert("Введите полный номер телефона");
      return;
    }

    try {
      if (this.options.sendCode) {
        await this.options.sendCode(this.phone);
      }
      this.step = "code";
      this.code = "";
      this.errorText = "";
      this.timerSec = 57;
      this.startTimer();
      this.render();
    } catch {
      alert("Не удалось отправить код. Попробуйте ещё раз.");
    }
  }

  private renderCode() {
    const boxesHtml = Array.from({ length: 4 }, (_, i) => {
      const digit = this.code[i] ?? "";
      const cls = [
        "code-box",
        digit ? "filled" : "",
        this.errorText ? "error" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `<div class="${cls}">${digit}</div>`;
    }).join("");

    const resendDisabled = this.timerSec > 0 || this.isResending;
    const resendText =
      this.timerSec > 0
        ? `Отправить код повторно (${this.formatTime(this.timerSec)})`
        : "Отправить код ещё раз";

    this.root.innerHTML = `
      <div class="auth-header">
        <button class="auth-back" type="button" aria-label="Назад">←</button>
      </div>
      <div class="auth-body">
        <p class="auth-subtitle">Введите 4-значный код<br>отправленный по SMS</p>
        <div class="code-boxes">${boxesHtml}</div>
        ${
          this.errorText
            ? `<div class="code-error-text">${this.errorText}</div>`
            : this.code.length === 0
              ? `<div class="code-timer">${this.formatTime(this.timerSec)}</div>`
              : ""
        }
        <button class="code-resend" type="button" ${resendDisabled ? "disabled" : ""}>
          ${resendText}
        </button>
        ${
          this.phone
            ? `<div class="code-sent-info">Код отправлен на номер ${this.phone}</div>`
            : ""
        }
        <input class="code-hidden-input" type="tel" inputmode="numeric" maxlength="4" />
      </div>
    `;

    const hidden = this.root.querySelector(".code-hidden-input") as HTMLInputElement;
    const back = this.root.querySelector(".auth-back") as HTMLButtonElement;
    const resend = this.root.querySelector(".code-resend") as HTMLButtonElement;
    const boxes = this.root.querySelector(".code-boxes") as HTMLElement;

    boxes.addEventListener("click", () => hidden.focus());
    hidden.focus();

    hidden.addEventListener("input", () => {
      const val = hidden.value.replace(/\D/g, "").slice(0, 4);
      this.code = val;
      this.errorText = "";
      this.render();
      const newHidden = this.root.querySelector(".code-hidden-input") as HTMLInputElement;
      newHidden.value = val;
      newHidden.focus();
      if (val.length === 4) {
        this.onCodeComplete(val);
      }
    });

    back.addEventListener("click", () => {
      this.stopTimer();
      this.step = "phone";
      this.code = "";
      this.errorText = "";
      this.render();
    });

    resend.addEventListener("click", () => this.onResend());
  }

  private async onCodeComplete(code: string) {
    let ok = true;
    if (this.options.verifyCode) {
      ok = await this.options.verifyCode(this.phone, code);
    } else {
      ok = code !== "0000";
    }

    if (ok) {
      this.stopTimer();
      this.options.onSuccess(this.phone);
    } else {
      this.errorText = "Неверный код. Повторите попытку";
      this.code = "";
      this.render();
      const hidden = this.root.querySelector(".code-hidden-input") as HTMLInputElement;
      hidden.focus();
    }
  }

  private async onResend() {
    if (this.timerSec > 0 || this.isResending) return;
    this.isResending = true;
    this.render();
    try {
      if (this.options.sendCode) {
        await this.options.sendCode(this.phone);
      }
      this.timerSec = 57;
      this.startTimer();
      this.errorText = "";
      this.code = "";
    } catch {
      alert("Не удалось отправить код повторно");
    } finally {
      this.isResending = false;
      this.render();
    }
  }

  private startTimer() {
    this.stopTimer();
    this.timerId = window.setInterval(() => {
      this.timerSec -= 1;
      if (this.timerSec <= 0) {
        this.stopTimer();
        this.timerSec = 0;
      }
      const resend = this.root.querySelector(".code-resend");
      const timerEl = this.root.querySelector(".code-timer");
      if (resend) {
        if (this.timerSec > 0) {
          resend.textContent = `Отправить код повторно (${this.formatTime(this.timerSec)})`;
          (resend as HTMLButtonElement).disabled = true;
        } else {
          resend.textContent = "Отправить код ещё раз";
          (resend as HTMLButtonElement).disabled = false;
        }
      }
      if (timerEl) {
        timerEl.textContent = this.formatTime(this.timerSec);
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  private formatPhone(raw: string): string {
    let digits = raw.replace(/\D/g, "");
    if (digits.startsWith("8")) digits = "7" + digits.slice(1);
    if (!digits.startsWith("7")) digits = "7" + digits;
    digits = digits.slice(0, 11);

    let result = "+7";
    if (digits.length > 1) result += " (" + digits.slice(1, 4);
    if (digits.length >= 4) result += ")";
    if (digits.length > 4) result += " " + digits.slice(4, 7);
    if (digits.length > 7) result += "-" + digits.slice(7, 9);
    if (digits.length > 9) result += "-" + digits.slice(9, 11);
    return result;
  }
}