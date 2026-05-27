"use client";

import { useState } from "react";

import { api } from "~/trpc/react";

export default function Home() {
  const [feedback, setFeedback] = useState<string>("");
  const utils = api.useUtils();
  const { data: tasks } = api.task.list.useQuery();
  const { mutate: createTask } = api.task.create.useMutation({
    onSuccess: async () => {
      setFeedback("Tarefa criada com sucesso.");
      await utils.task.list.invalidate();
    },
    onError: (error) => {
      setFeedback(error.message);
    },
  });
  const { mutate: updateTask } = api.task.update.useMutation({
    onSuccess: async () => {
      setFeedback("Tarefa atualizada com sucesso.");
      await utils.task.list.invalidate();
    },
    onError: (error) => {
      setFeedback(error.message);
    },
  });
  const { mutate: deleteTask } = api.task.delete.useMutation({
    onSuccess: async () => {
      setFeedback("Tarefa removida com sucesso.");
      await utils.task.list.invalidate();
    },
    onError: (error) => {
      setFeedback(error.message);
    },
  });

  const firstTask = tasks?.[0];

  return (
    <main>
      <h1>Task Manager</h1>
      <p>Controles simples para testar os endpoints de tarefas.</p>
      <button
        onClick={() =>
          createTask({
            titulo: `Task ${Date.now()}`,
            descricao: "Tarefa criada pelo botao de teste",
            prazo: new Date(),
          })
        }
      >
        Criar tarefa
      </button>
      <button
        disabled={!firstTask}
        onClick={() => {
          if (!firstTask) return;

          updateTask({
            id: firstTask.id,
            titulo: `${firstTask.titulo} (editada)`,
            status: firstTask.status === "pendente" ? "concluida" : "pendente",
          });
        }}
      >
        Atualizar primeira tarefa
      </button>
      <button
        disabled={!firstTask}
        onClick={() => {
          if (!firstTask) return;
          deleteTask({ id: firstTask.id });
        }}
      >
        Deletar primeira tarefa
      </button>
      {feedback ? <p>{feedback}</p> : null}
      <pre>{JSON.stringify(tasks, null, 2)}</pre>
    </main>
  );
}
