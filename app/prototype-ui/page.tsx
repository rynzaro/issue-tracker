// PROTOTYPE — throwaway route. Sits next to the real tree UI on purpose.
// Static segment, so it never collides with a real [project-id] (those are cuids).
// Delete this whole folder once the design question is settled.

import { Suspense } from "react";
import PrototypeUI from "./prototype-ui";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PrototypeUI />
    </Suspense>
  );
}
