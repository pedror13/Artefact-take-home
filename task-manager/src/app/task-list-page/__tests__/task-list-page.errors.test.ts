import { describe, expect, it } from "vitest";

import { getErrorMessage, getZodFieldErrors } from "../task-list-page.errors";

const buildTrpcZodError = (
  fieldErrors: Record<string, string[]>,
  formErrors: string[] = [],
) => ({
  message: "validation failed",
  data: {
    code: "BAD_REQUEST",
    httpStatus: 400,
    zodError: {
      fieldErrors,
      formErrors,
    },
  },
});

describe("getZodFieldErrors", () => {
  it("retorna mapa vazio quando o erro nao tem zodError", () => {
    expect(getZodFieldErrors(new Error("boom"))).toEqual({});
    expect(getZodFieldErrors(null)).toEqual({});
    expect(getZodFieldErrors(undefined)).toEqual({});
    expect(getZodFieldErrors("string solta")).toEqual({});
  });

  it("extrai a primeira mensagem de cada campo", () => {
    const error = buildTrpcZodError({
      titulo: ["titulo e obrigatorio", "outra mensagem ignorada"],
      prazo: ["data invalida"],
    });

    expect(getZodFieldErrors(error)).toEqual({
      titulo: "titulo e obrigatorio",
      prazo: "data invalida",
    });
  });

  it("ignora campos sem mensagens utilizaveis", () => {
    const error = buildTrpcZodError({
      titulo: [],
      descricao: [""],
      prazo: ["valido"],
    });

    expect(getZodFieldErrors(error)).toEqual({ prazo: "valido" });
  });
});

describe("getErrorMessage", () => {
  it("retorna mensagens de campo do Zod concatenadas quando disponiveis", () => {
    const error = buildTrpcZodError({
      titulo: ["titulo e obrigatorio"],
      prazo: ["data invalida"],
    });

    expect(getErrorMessage(error)).toBe("titulo e obrigatorio data invalida");
  });

  it("usa formErrors quando nao ha fieldErrors uteis", () => {
    const error = buildTrpcZodError({}, ["payload invalido"]);

    expect(getErrorMessage(error)).toBe("payload invalido");
  });

  it("cai para error.message quando nao e erro Zod", () => {
    expect(getErrorMessage(new Error("tarefa nao encontrada"))).toBe(
      "tarefa nao encontrada",
    );
  });

  it("le .message de objetos genericos vindos do tRPC client", () => {
    expect(getErrorMessage({ message: "internal" })).toBe("internal");
  });

  it("retorna mensagem padrao quando nao consegue extrair nada util", () => {
    expect(getErrorMessage(null)).toBe("Ocorreu um erro inesperado.");
    expect(getErrorMessage({})).toBe("Ocorreu um erro inesperado.");
    expect(getErrorMessage({ message: "" })).toBe("Ocorreu um erro inesperado.");
  });
});
