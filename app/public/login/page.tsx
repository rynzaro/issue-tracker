import { Suspense } from "react";
import Login from "./login";

export default function Page() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}
