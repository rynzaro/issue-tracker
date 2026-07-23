# Resources

## Primary (high trust)

- **A Philosophy of Software Design — John Ousterhout (book, 2nd ed.)**
  The source of "deep module", "shallow module", "information hiding vs leakage",
  "complexity is what makes software hard to change". The course backbone.
  Buy/borrow; no legal free full text.
- **Talks at Google: "A Philosophy of Software Design" — John Ousterhout (2018)**
  https://www.youtube.com/watch?v=bmSAYlu0NcY
  1-hour compressed version of the book. Verified 2026-07-13. Best first watch.
- **D. L. Parnas — "On the Criteria To Be Used in Decomposing Systems into Modules" (1972)**
  https://dl.acm.org/doi/10.1145/361598.361623
  The origin of information hiding. Short, readable. (Link from parametric
  knowledge — check it resolves before citing in a lesson. TODO verify.)
- **Michael Feathers — Working Effectively with Legacy Code (book)**
  Origin of the "seam" term the local vocabulary uses. Chapter 4.

## Local (this repo — highest relevance)

- `.claude/skills/codebase-design/SKILL.md` — the vocabulary source of truth:
  module, interface, implementation, depth, seam, adapter, leverage, locality;
  deletion test; "the interface is the test surface"; one-adapter/two-adapter rule.
- `reference/architecture-review-20260710-185006.html` + `-201757.html` —
  two reviews of OnTrack, 2026-07-10. The practice material.
- `lib/services/task.service.ts`, `lib/services/taskHierarchyPolicy.ts`,
  `lib/services/project.service.ts` — the real code the lessons dissect.
- `docs/adr/` — decisions already made (AD-18/19/20); lessons must not re-litigate.

## Secondary

- Pragmatic Engineer interview with Ousterhout (2024/25):
  https://newsletter.pragmaticengineer.com/p/the-philosophy-of-software-design
- SE Radio 520 (audio): https://se-radio.net/2022/07/episode-520-john-ousterhout-on-a-philosophy-of-software-design/
- Ousterhout vs Uncle Bob discussion (contrasting views, good for wisdom):
  https://www.youtube.com/watch?v=3Vlk6hCWBw0

## Learning method (meta — why lessons are shaped this way)

- Dunlosky et al. 2013, "Improving Students' Learning With Effective Learning
  Techniques", PSPI 14(1): distributed practice + practice testing = high
  utility; rereading = low utility. Verified 2026-07-13.
  https://journals.sagepub.com/doi/abs/10.1177/1529100612453266
  Free readable version: https://www.aft.org/ae/fall2013/dunlosky

## Communities (wisdom)

- TODO: propose once Felix confirms interest. Candidates: r/ExperiencedDevs,
  Software Design book clubs, Ousterhout's own aposd discussions on GitHub.
