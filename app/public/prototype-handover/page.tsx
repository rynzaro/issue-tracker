// PROTOTYPE — throwaway. Three variants of the CEO's project view AFTER handing
// a task to the CTO, switchable via ?variant= on this route. Question: what
// flows back up to the hander? (a) status only, (b) rolled-up time only,
// (c) everything. Stub data, read-only, no DB, no auth.
//
// Variants differ by WHAT DATA IS VISIBLE, not by layout — that is the design
// question here. Delete this route once the decision is folded in.

import { Suspense } from "react";
import HandoverPrototype from "./prototype";

export default function Page() {
  return (
    <Suspense>
      <HandoverPrototype />
    </Suspense>
  );
}
