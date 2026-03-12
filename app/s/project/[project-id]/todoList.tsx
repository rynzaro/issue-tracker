import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { DialogTitle } from "@/components/dialog";
import { Input } from "@/components/input";
import { useState } from "react";


export default function TodoList() {
  const [isPressed, setIsPressed] = useState(
  )
  return (
    
    <>
      <Checkbox className="mr-2" />
      <Input
        name="add"
      />
      <Button
        plain
        onClick={() => {
          
        }}
      >
        +
      </Button>
      <Field>
        <div>
          <Label>To-Do Liste</Label>
        </div>
        <TodoList />
      </Field>
    </>
  );
}

