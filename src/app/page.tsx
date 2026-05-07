import { createClient } from "@/utils/supabase/server";

type Todo = {
  id: string;
  name: string;
};

export default async function Page() {
  const supabase = await createClient();
  const { data: todos } = await supabase.from("todos").select("id, name");

  return (
    <ul>
      {(todos as Todo[] | null)?.map((todo) => (
        <li key={todo.id}>{todo.name}</li>
      ))}
    </ul>
  );
}
