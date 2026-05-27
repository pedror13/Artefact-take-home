// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

import { createCaller } from "~/server/api/root";
import type { Task } from "~/server/api/domains/task/task.types";

type Caller = ReturnType<typeof createCaller>;

const buildCaller = (): Caller => createCaller({ headers: new Headers() });

/**
 * O router mantem um store em `globalThis.__taskStore`. Resetamos antes de
 * cada teste para garantir isolamento, mesmo dentro do mesmo arquivo.
 */
const resetTaskStore = () => {
  if (globalThis.__taskStore) {
    globalThis.__taskStore.tasks = [];
  }
};

/**
 * Insere tarefas diretamente no store sem passar pelo `create`. Util para
 * testes de paginacao quando precisamos de timestamps controlados.
 */
const seedTasks = (...tasks: Task[]) => {
  globalThis.__taskStore ??= { tasks: [] };
  globalThis.__taskStore.tasks.push(...tasks);
};

const buildTask = (overrides: Partial<Task> = {}): Task => ({
  id: crypto.randomUUID(),
  titulo: "tarefa de teste",
  descricao: undefined,
  dataCriacao: new Date("2026-01-01T12:00:00Z"),
  prazo: undefined,
  status: "pendente",
  ...overrides,
});

describe("taskRouter", () => {
  let caller: Caller;

  beforeEach(() => {
    resetTaskStore();
    caller = buildCaller();
  });

  describe("create", () => {
    it("cria uma tarefa com os campos minimos", async () => {
      const created = await caller.task.create({ titulo: "minha tarefa" });

      expect(created).toMatchObject({
        titulo: "minha tarefa",
        status: "pendente",
      });
      expect(created.id).toBeTypeOf("string");
      expect(created.id.length).toBeGreaterThan(0);
      expect(created.dataCriacao).toBeInstanceOf(Date);
      expect(created.descricao).toBeUndefined();
      expect(created.prazo).toBeUndefined();
    });

    it("aceita descricao e prazo opcionais", async () => {
      const prazo = new Date("2026-12-31T23:59:59Z");
      const created = await caller.task.create({
        titulo: "com extras",
        descricao: "uma descricao",
        prazo,
      });

      expect(created.descricao).toBe("uma descricao");
      expect(created.prazo?.toISOString()).toBe(prazo.toISOString());
    });

    it("trim no titulo antes de salvar", async () => {
      const created = await caller.task.create({ titulo: "   espacos   " });
      expect(created.titulo).toBe("espacos");
    });

    it("rejeita titulo vazio com erro de validacao Zod", async () => {
      await expect(caller.task.create({ titulo: "" })).rejects.toThrow();
      await expect(caller.task.create({ titulo: "   " })).rejects.toThrow();
    });

    it("persiste a tarefa criada no store", async () => {
      const created = await caller.task.create({ titulo: "persistida" });
      const result = await caller.task.list({ limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe(created.id);
    });
  });

  describe("list", () => {
    it("retorna lista vazia quando nao ha tarefas", async () => {
      const result = await caller.task.list({ limit: 10 });

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.nextCursor).toBeNull();
    });

    it("ordena por dataCriacao decrescente", async () => {
      seedTasks(
        buildTask({ id: "old", dataCriacao: new Date("2026-01-01T00:00:00Z") }),
        buildTask({ id: "mid", dataCriacao: new Date("2026-01-02T00:00:00Z") }),
        buildTask({ id: "new", dataCriacao: new Date("2026-01-03T00:00:00Z") }),
      );

      const result = await caller.task.list({ limit: 10 });

      expect(result.items.map((task) => task.id)).toEqual(["new", "mid", "old"]);
    });

    it("respeita o limite e retorna nextCursor quando ha mais resultados", async () => {
      seedTasks(
        buildTask({ id: "t1", dataCriacao: new Date("2026-01-01T00:00:00Z") }),
        buildTask({ id: "t2", dataCriacao: new Date("2026-01-02T00:00:00Z") }),
        buildTask({ id: "t3", dataCriacao: new Date("2026-01-03T00:00:00Z") }),
      );

      const result = await caller.task.list({ limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.items.map((task) => task.id)).toEqual(["t3", "t2"]);
      expect(result.nextCursor).not.toBeNull();
      expect(result.totalCount).toBe(3);
    });

    it("pagina corretamente quando recebe cursor", async () => {
      seedTasks(
        buildTask({ id: "t1", dataCriacao: new Date("2026-01-01T00:00:00Z") }),
        buildTask({ id: "t2", dataCriacao: new Date("2026-01-02T00:00:00Z") }),
        buildTask({ id: "t3", dataCriacao: new Date("2026-01-03T00:00:00Z") }),
      );

      const firstPage = await caller.task.list({ limit: 2 });
      const secondPage = await caller.task.list({
        limit: 2,
        cursor: firstPage.nextCursor!,
      });

      expect(secondPage.items.map((task) => task.id)).toEqual(["t1"]);
      expect(secondPage.nextCursor).toBeNull();
    });

    it("desempata por id quando dataCriacao e identica", async () => {
      const sameDate = new Date("2026-01-01T00:00:00Z");
      seedTasks(
        buildTask({ id: "aaa", dataCriacao: sameDate }),
        buildTask({ id: "bbb", dataCriacao: sameDate }),
        buildTask({ id: "ccc", dataCriacao: sameDate }),
      );

      const result = await caller.task.list({ limit: 10 });

      // Tie-break por id em ordem decrescente.
      expect(result.items.map((task) => task.id)).toEqual(["ccc", "bbb", "aaa"]);
    });

    it("rejeita cursor invalido com BAD_REQUEST", async () => {
      await expect(
        caller.task.list({ limit: 10, cursor: "cursor-malformado" }),
      ).rejects.toThrow(/cursor invalido/i);
    });
  });

  describe("update", () => {
    it("atualiza titulo, descricao, prazo e status", async () => {
      const created = await caller.task.create({ titulo: "antigo" });

      const novoPrazo = new Date("2026-06-01T00:00:00Z");
      const updated = await caller.task.update({
        id: created.id,
        titulo: "novo titulo",
        descricao: "nova descricao",
        prazo: novoPrazo,
        status: "concluida",
      });

      expect(updated.titulo).toBe("novo titulo");
      expect(updated.descricao).toBe("nova descricao");
      expect(updated.prazo?.toISOString()).toBe(novoPrazo.toISOString());
      expect(updated.status).toBe("concluida");
      expect(updated.id).toBe(created.id);
      expect(updated.dataCriacao.toISOString()).toBe(created.dataCriacao.toISOString());
    });

    it("permite limpar descricao e prazo enviando undefined", async () => {
      const created = await caller.task.create({
        titulo: "com extras",
        descricao: "tem descricao",
        prazo: new Date("2026-06-01T00:00:00Z"),
      });

      const updated = await caller.task.update({
        id: created.id,
        titulo: created.titulo,
      });

      expect(updated.descricao).toBeUndefined();
      expect(updated.prazo).toBeUndefined();
    });

    it("preserva status quando nao e enviado", async () => {
      const created = await caller.task.create({ titulo: "pendente" });
      const updated = await caller.task.update({
        id: created.id,
        titulo: "ainda pendente",
      });

      expect(updated.status).toBe("pendente");
    });

    it("falha com NOT_FOUND para id inexistente", async () => {
      await expect(
        caller.task.update({ id: "nao-existe", titulo: "any" }),
      ).rejects.toThrow(/nao encontrada/i);
    });

    it("rejeita titulo vazio mesmo em update", async () => {
      const created = await caller.task.create({ titulo: "valido" });

      await expect(
        caller.task.update({ id: created.id, titulo: "" }),
      ).rejects.toThrow();
    });
  });

  describe("delete", () => {
    it("remove a tarefa do store", async () => {
      const created = await caller.task.create({ titulo: "delete me" });

      const deleted = await caller.task.delete({ id: created.id });

      expect(deleted.id).toBe(created.id);
      const remaining = await caller.task.list({ limit: 10 });
      expect(remaining.items).toHaveLength(0);
    });

    it("falha com NOT_FOUND para id inexistente", async () => {
      await expect(
        caller.task.delete({ id: "nao-existe" }),
      ).rejects.toThrow(/nao encontrada/i);
    });

    it("nao afeta outras tarefas ao remover uma", async () => {
      const t1 = await caller.task.create({ titulo: "fica" });
      const t2 = await caller.task.create({ titulo: "vai" });

      await caller.task.delete({ id: t2.id });

      const result = await caller.task.list({ limit: 10 });
      expect(result.items.map((task) => task.id)).toEqual([t1.id]);
    });
  });
});
