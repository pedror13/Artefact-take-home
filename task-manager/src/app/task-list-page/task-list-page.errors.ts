/**
 * Utilitarios para extrair mensagens de erro vindas do tRPC.
 *
 * O backend (em `src/server/api/trpc.ts`) ja repassa `zodError.flatten()` em
 * `error.data.zodError`. Aqui consumimos essa estrutura de forma defensiva para
 * exibir mensagens de validacao por campo no formulario.
 */

type FlattenedZodError = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};

export function getZodFieldErrors(error: unknown): Record<string, string> {
  const flattened = extractFlattenedZodError(error);
  if (!flattened?.fieldErrors) return {};

  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(flattened.fieldErrors)) {
    const firstMessage = messages?.[0];
    if (typeof firstMessage === "string" && firstMessage.length > 0) {
      result[field] = firstMessage;
    }
  }
  return result;
}

export function getErrorMessage(error: unknown): string {
  const flattened = extractFlattenedZodError(error);
  if (flattened) {
    const fieldMessages = Object.values(getZodFieldErrors(error));
    if (fieldMessages.length > 0) return fieldMessages.join(" ");
    if (flattened.formErrors && flattened.formErrors.length > 0) {
      return flattened.formErrors.join(" ");
    }
  }

  if (error instanceof Error && error.message) return error.message;

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }

  return "Ocorreu um erro inesperado.";
}

function extractFlattenedZodError(error: unknown): FlattenedZodError | null {
  if (!error || typeof error !== "object") return null;
  const data = (error as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  const zodError = (data as { zodError?: FlattenedZodError | null }).zodError;
  if (!zodError || typeof zodError !== "object") return null;
  return zodError;
}
