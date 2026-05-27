import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TaskFormModal } from "../task-form-modal";

type RenderOptions = {
  isOpen?: boolean;
  isSubmitting?: boolean;
  initialValues?: {
    titulo: string;
    descricao: string;
    prazo: string;
  };
  onClose?: () => void;
  onSubmit?: (input: {
    titulo: string;
    descricao?: string;
    prazo?: Date;
  }) => Promise<void>;
};

const defaultInitialValues = {
  titulo: "",
  descricao: "",
  prazo: "",
};

const renderModal = (options: RenderOptions = {}) => {
  const onClose = options.onClose ?? vi.fn();
  const onSubmit = options.onSubmit ?? vi.fn().mockResolvedValue(undefined);

  const utils = render(
    <TaskFormModal
      isOpen={options.isOpen ?? true}
      title="Editar tarefa"
      submitLabel="Salvar"
      isSubmitting={options.isSubmitting ?? false}
      initialValues={options.initialValues ?? defaultInitialValues}
      onClose={onClose}
      onSubmit={onSubmit}
    />,
  );

  return { ...utils, onClose, onSubmit };
};

afterEach(() => {
  cleanup();
});

describe("TaskFormModal", () => {
  describe("renderizacao", () => {
    it("nao renderiza nada quando isOpen=false", () => {
      const { container } = renderModal({ isOpen: false });
      expect(container).toBeEmptyDOMElement();
    });

    it("renderiza dialog acessivel com titulo associado", () => {
      renderModal();

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAccessibleName("Editar tarefa");
    });

    it("popula os campos a partir de initialValues", () => {
      renderModal({
        initialValues: {
          titulo: "valor inicial",
          descricao: "descricao inicial",
          prazo: "2026-06-01T10:00",
        },
      });

      expect(screen.getByLabelText("Título")).toHaveValue("valor inicial");
      expect(screen.getByLabelText("Descrição")).toHaveValue("descricao inicial");
      expect(screen.getByLabelText("Prazo")).toHaveValue("2026-06-01T10:00");
    });

    it("foca o campo Titulo ao abrir", async () => {
      renderModal();
      await waitFor(() => {
        expect(screen.getByLabelText("Título")).toHaveFocus();
      });
    });
  });

  describe("validacao local", () => {
    it("nao chama onSubmit quando titulo esta vazio", async () => {
      const user = userEvent.setup();
      const { onSubmit, onClose } = renderModal();

      await user.click(screen.getByRole("button", { name: "Salvar" }));

      expect(onSubmit).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText("O título é obrigatório.")).toBeInTheDocument();
      // Apos o erro o <span> entra dentro do <label>, expandindo o accessible
      // name. Usamos getByRole para buscar pelo papel do input.
      expect(
        screen.getByRole("textbox", { name: /título/i }),
      ).toHaveAttribute("aria-invalid", "true");
    });

    it("nao chama onSubmit quando titulo so tem espacos", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderModal({
        initialValues: { titulo: "   ", descricao: "", prazo: "" },
      });

      await user.click(screen.getByRole("button", { name: "Salvar" }));

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByText("O título é obrigatório.")).toBeInTheDocument();
    });
  });

  describe("submissao", () => {
    it("chama onSubmit com payload trimado e fecha o modal em sucesso", async () => {
      const user = userEvent.setup();
      const { onSubmit, onClose } = renderModal();

      await user.type(screen.getByLabelText("Título"), "   Tarefa nova   ");
      await user.type(screen.getByLabelText("Descrição"), " descricao  ");
      await user.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      expect(onSubmit).toHaveBeenCalledWith({
        titulo: "Tarefa nova",
        descricao: "descricao",
        prazo: undefined,
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("envia descricao=undefined quando o campo fica em branco", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderModal();

      await user.type(screen.getByLabelText("Título"), "ok");
      await user.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ descricao: undefined, prazo: undefined }),
        );
      });
    });

    it("converte prazo digitado para Date", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderModal();

      await user.type(screen.getByLabelText("Título"), "com prazo");
      const prazoInput = screen.getByLabelText("Prazo");
      await user.type(prazoInput, "2026-06-01T10:30");

      await user.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });

      const callArg = (onSubmit as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
        prazo: Date | undefined;
      };
      expect(callArg.prazo).toBeInstanceOf(Date);
    });
  });

  describe("tratamento de erro", () => {
    it("mostra erro por campo quando onSubmit rejeita com zodError", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockRejectedValue({
        message: "validation failed",
        data: {
          zodError: {
            fieldErrors: { titulo: ["titulo invalido no backend"] },
            formErrors: [],
          },
        },
      });
      const { onClose } = renderModal({ onSubmit });

      await user.type(screen.getByLabelText("Título"), "qualquer");
      await user.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => {
        expect(
          screen.getByText("titulo invalido no backend"),
        ).toBeInTheDocument();
      });

      expect(
        screen.getByRole("textbox", { name: /título/i }),
      ).toHaveAttribute("aria-invalid", "true");
      // Modal NAO fecha em caso de erro.
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("mostra banner de erro generico quando onSubmit rejeita sem zodError", async () => {
      const user = userEvent.setup();
      const onSubmit = vi
        .fn()
        .mockRejectedValue(new Error("tarefa nao encontrada"));
      const { onClose } = renderModal({ onSubmit });

      await user.type(screen.getByLabelText("Título"), "qualquer");
      await user.click(screen.getByRole("button", { name: "Salvar" }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("tarefa nao encontrada");
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("acessibilidade e atalhos", () => {
    it("ESC chama onClose", async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal();

      await user.keyboard("{Escape}");

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("ESC nao chama onClose quando isSubmitting", async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal({ isSubmitting: true });

      await user.keyboard("{Escape}");

      expect(onClose).not.toHaveBeenCalled();
    });

    it("click no overlay fecha o modal", async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal();

      // O overlay e o elemento com role=presentation envolvendo o dialog.
      const overlay = screen.getByRole("presentation");
      await user.click(overlay);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("click dentro do form nao fecha o modal", async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal();

      await user.click(screen.getByLabelText("Título"));

      expect(onClose).not.toHaveBeenCalled();
    });

    it("desabilita os botoes e inputs quando isSubmitting=true", () => {
      renderModal({ isSubmitting: true });

      expect(screen.getByLabelText("Título")).toBeDisabled();
      expect(screen.getByLabelText("Descrição")).toBeDisabled();
      expect(screen.getByLabelText("Prazo")).toBeDisabled();
      expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
      // Botao primario mostra "Salvando..." no estado submitting.
      expect(screen.getByRole("button", { name: "Salvando..." })).toBeDisabled();
    });
  });
});

// Garante que o overflow do body e restaurado quando o modal fecha entre testes.
beforeEach(() => {
  document.body.style.overflow = "";
});
