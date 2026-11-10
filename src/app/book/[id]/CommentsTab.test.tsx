// src/app/book/[id]/CommentsTab.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CommentsTab from "./CommentsTab";
import { addComment } from "@/lib/actions/comments";
import type { Comment } from "@/lib/types";

// Мок Server Action — тест не должен ходить в БД.
jest.mock("@/lib/actions/comments", () => ({
  addComment: jest.fn(),
}));

const mockedAddComment = addComment as jest.MockedFunction<typeof addComment>;

const initialComments: Comment[] = [
  {
    id: "c-1",
    user: "Анна",
    avatar: "АН",
    date: "Вчера",
    rating: 9,
    text: "Отличная книга",
    likes: 3,
    isSpoiler: false,
  },
];

describe("CommentsTab", () => {
  beforeEach(() => {
    mockedAddComment.mockReset();
  });

  it("показывает заголовок и начальные комментарии", () => {
    render(<CommentsTab bookId="book-1" initialComments={initialComments} />);

    expect(
      screen.getByRole("heading", { name: /отзывы и комментарии \(1\)/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Отличная книга")).toBeInTheDocument();
    expect(screen.getByText("Анна")).toBeInTheDocument();
  });

  it("показывает ошибку, если текст короче 3 символов", () => {
    render(<CommentsTab bookId="book-1" initialComments={[]} />);

    const textarea = screen.getByLabelText(/текст комментария/i);
    fireEvent.change(textarea, { target: { value: "ok" } });

    const submit = screen.getByRole("button", { name: /отправить отзыв/i });
    fireEvent.click(submit);

    expect(
      screen.getByText(/комментарий должен быть не короче 3 символов/i)
    ).toBeInTheDocument();
    expect(mockedAddComment).not.toHaveBeenCalled();
  });

  it("отправляет комментарий и добавляет его в список", async () => {
    mockedAddComment.mockResolvedValueOnce({
      success: true,
      comment: {
        id: "c-2",
        user: "Иван",
        avatar: "ИВ",
        date: "Сегодня",
        rating: 8,
        text: "Хорошая озвучка",
        likes: 0,
        isSpoiler: false,
      },
    });

    const onCommentAdded = jest.fn();
    render(
      <CommentsTab
        bookId="book-1"
        initialComments={[]}
        onCommentAdded={onCommentAdded}
      />
    );

    fireEvent.change(screen.getByLabelText(/ваше имя/i), {
      target: { value: "Иван" },
    });
    fireEvent.change(screen.getByLabelText(/текст комментария/i), {
      target: { value: "Хорошая озвучка" },
    });

    const submit = screen.getByRole("button", { name: /отправить отзыв/i });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(mockedAddComment).toHaveBeenCalledTimes(1);
    });

    expect(mockedAddComment).toHaveBeenCalledWith({
      bookId: "book-1",
      user: "Иван",
      text: "Хорошая озвучка",
      rating: 10,
      isSpoiler: false,
    });

    await waitFor(() => {
      expect(screen.getByText("Хорошая озвучка")).toBeInTheDocument();
    });

    expect(onCommentAdded).toHaveBeenCalledTimes(1);
  });

  it("показывает ошибку сервера, если addComment вернул success: false", async () => {
    mockedAddComment.mockResolvedValueOnce({
      success: false,
      error: "Проверьте поля формы",
      fieldErrors: { text: "Комментарий не длиннее 2000 символов" },
    });

    render(<CommentsTab bookId="book-1" initialComments={[]} />);

    fireEvent.change(screen.getByLabelText(/текст комментария/i), {
      target: { value: "Длинный текст" },
    });

    const submit = screen.getByRole("button", { name: /отправить отзыв/i });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(screen.getByText("Проверьте поля формы")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/комментарий не длиннее 2000 символов/i)
    ).toBeInTheDocument();
  });

  it("показывает ошибку, если Server Action упал", async () => {
    mockedAddComment.mockRejectedValueOnce(new Error("network"));

    render(<CommentsTab bookId="book-1" initialComments={[]} />);

    fireEvent.change(screen.getByLabelText(/текст комментария/i), {
      target: { value: "Текст" },
    });

    const submit = screen.getByRole("button", { name: /отправить отзыв/i });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(
        screen.getByText(/не удалось отправить комментарий/i)
      ).toBeInTheDocument();
    });
  });

  it("скрывает спойлер и показывает по клику", () => {
    render(
      <CommentsTab
        bookId="book-1"
        initialComments={[
          {
            id: "c-spoiler",
            user: "Тест",
            avatar: "ТЕ",
            date: "Сегодня",
            rating: 10,
            text: "Спойлер: главный герой умирает",
            likes: 0,
            isSpoiler: true,
          },
        ]}
      />
    );

    expect(
      screen.getByText(/этот комментарий помечен как спойлер/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText(/показать/i));

    expect(
      screen.getByText(/спойлер: главный герой умирает/i)
    ).toBeInTheDocument();
  });
});