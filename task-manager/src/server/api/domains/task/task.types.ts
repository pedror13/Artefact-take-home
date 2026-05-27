export type TaskStatus = "pendente" | "concluida";

export type Task = {
  id: string;
  titulo: string;
  descricao?: string;
  dataCriacao: Date;
  prazo?: Date;
  status: TaskStatus;
};

export type TaskStore = {
  tasks: Task[];
};
