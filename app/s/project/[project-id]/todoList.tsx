import { Field, Label } from "@headlessui/react";

export default function TodoList() {
  return (
    <>
      <Field>
        <div>
          <Label>To-Do Liste</Label>
        </div>
        <TodoList />
      </Field>
    </>
  );
}
