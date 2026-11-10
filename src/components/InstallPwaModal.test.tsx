// src/components/InstallPwaModal.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import InstallPwaModal from "./InstallPwaModal";

global.window.__pwa_is_installed = false;
global.window.__pwa_install_prompt = undefined;

describe("InstallPwaModal", () => {
  const onCloseMock = jest.fn();

  beforeEach(() => {
    onCloseMock.mockClear();
  });

  it("не имеет нарушений доступности (a11y)", async () => {
    const { container } = render(
      <InstallPwaModal isOpen={true} onClose={onCloseMock} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("закрывается по нажатию Escape", async () => {
    const user = userEvent.setup();
    render(<InstallPwaModal isOpen={true} onClose={onCloseMock} />);
    await user.keyboard("{Escape}");
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("фокусируется на первой кнопке при открытии и не выпускает фокус наружу", async () => {
    const user = userEvent.setup();
    render(<InstallPwaModal isOpen={true} onClose={onCloseMock} />);

    // Ждем появления кнопки "Закрыть" в DOM
    const closeButton = await screen.findByRole("button", { name: /закрыть/i });

    // Ждем, пока фокус перейдет на кнопку (с учетом requestAnimationFrame)
    await waitFor(() => {
      expect(document.activeElement).toBe(closeButton);
    });

    // Проверяем, что фокус не уходит за пределы модалки.
    // 1. Tab с крестика должен вести на кнопку установки
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: /установить на главный экран/i })
    );

    // 2. Следующий Tab должен вернуть фокус на крестик (циклический переход)
    await user.tab();
    expect(document.activeElement).toBe(closeButton);
  });
});