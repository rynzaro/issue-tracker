---
name: ask-user-questions-extended
description: "Use this skill whenever the user's request is vague, ambiguous, or missing key details — especially when they ask Copilot to build something new, refactor existing code, or make a change whose scope or intent isn't fully clear. Before writing any code, this skill directs Copilot to ask 3–5 targeted clarifying questions in a numbered plain-text list, then iteratively follow up until the intent is fully understood. Trigger this skill any time you're unsure what the user actually wants — do NOT guess and generate code when ambiguity exists. This skill should also trigger when the user says things like 'can you help me with...', 'I need to change...', 'build me a...', 'refactor this...', or describes a goal without specifying implementation details."
---

# AskUserQuestionsSkill

## Purpose

Clarify the user's intent before writing code. Guessing leads to wasted iterations.
This skill ensures Copilot fully understands what the user wants — technically and
contextually — before generating anything.

---

## When to Trigger

Trigger this skill when **any** of the following are true:

- The user's request could be implemented in multiple meaningfully different ways
- The user describes a _goal_ but not the _approach_ (e.g. "make it faster", "add auth")
- The user wants something _new_ built (feature, component, module, script, etc.)
- The user wants to _refactor or change_ existing code but hasn't specified scope or constraints
- Key details are missing: language, framework, file target, input/output shape, edge cases, etc.

Do **not** trigger this skill for:

- Simple, unambiguous one-liner completions
- Requests with fully specified requirements
- Follow-up messages that already answer prior questions

---

## Behavior

### Step 1 — Analyze the request

Before asking anything, briefly identify internally:

- What is the user trying to accomplish?
- What is _unknown or underspecified_ that would affect how you'd write the code?
- What are the 3–5 most important gaps to close?

### Step 2 — Ask 3–5 targeted questions

Output a short lead-in sentence, then a **numbered plain-text list** of questions.

**Rules for questions:**

- Ask only what you genuinely need — don't pad the list
- Order by importance (most critical gap first)
- Each question should be specific and answerable, not open-ended or philosophical
- Group related sub-questions into one item if needed (e.g. "What language and framework?")
- Do NOT generate any code at this stage

**Question categories to draw from (pick the most relevant):**

| Category            | Example questions                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Scope               | Which files/functions are in scope? Should this be a new file or added to an existing one? |
| Language & stack    | What language/framework/runtime is this for? Any version constraints?                      |
| Input / output      | What does the input look like? What should the output be?                                  |
| Edge cases          | How should errors be handled? What if the input is empty/null/invalid?                     |
| Style & patterns    | Should this match existing code patterns? Any naming conventions to follow?                |
| Performance / scale | How large is the dataset / how frequently will this run?                                   |
| Testing             | Should tests be included? What testing framework is used?                                  |
| Dependencies        | Can new libraries be added, or should this use only what's already installed?              |

### Step 3 — Wait for the user's response

Do not generate code. Wait.

### Step 4 — Evaluate completeness

After the user responds, determine:

- **Are the critical gaps closed?** → Proceed to generate code with a brief summary of your understanding.
- **Are there still blockers?** → Ask 1–3 targeted follow-up questions (never re-ask answered questions).

Repeat Step 4 until you have enough to proceed confidently. Keep follow-up rounds tight — if you've asked two rounds and still have minor gaps, make a reasonable assumption, _state it explicitly_, and proceed.

---

## Output Format

### Initial question block

```
Before I write any code, I have a few questions to make sure I get this right:

1. [Most critical question]
2. [Second question]
3. [Third question]
4. [Fourth question, if needed]
5. [Fifth question, if needed]
```

### Follow-up (if still unclear after first answer)

```
Thanks — that helps. A couple of follow-up questions:

1. [Unresolved gap]
2. [Unresolved gap]
```

### Proceeding to code (after clarity is reached)

```
Got it. Here's my understanding:
- [Bullet summary of key decisions/assumptions]
- [Any assumption you're making for unspecified details]

[Code follows below]
```

---

## Examples

### Example 1 — Vague new feature request

**User:** "Add authentication to my app."

**Copilot output:**

```
Before I write any code, I have a few questions to make sure I get this right:

1. What language and framework is this app using? (e.g. Express/Node, FastAPI/Python, Rails, etc.)
2. What authentication method do you want — session-based, JWT tokens, OAuth (social login), or something else?
3. Do you already have a users table or user model, or does that need to be created too?
4. Should I include login and registration endpoints, or just the auth middleware/guards?
5. Are there any libraries already installed you'd like me to use (e.g. Passport.js, bcrypt, FastAPI-Users)?
```

---

### Example 2 — Vague refactor request

**User:** "Refactor this function, it's too slow."

**Copilot output:**

```
Before I write any code, I have a few questions to make sure I get this right:

1. Can you share the function (or point me to it)? I want to see the current implementation.
2. Do you know where the bottleneck is — is it I/O, CPU, database queries, or something else?
3. Are there constraints I should work within — e.g. no new dependencies, must stay synchronous, can't change the function signature?
4. Do you have performance targets in mind, or is "faster" the goal generally?
```

---

### Example 3 — Ambiguous change

**User:** "Make the error handling better."

**Copilot output:**

```
Before I write any code, I have a few questions to make sure I get this right:

1. Which file or module should I focus on? (Or is this a project-wide change?)
2. What's wrong with the current error handling — is it too generic, missing cases, not logging, swallowing errors silently?
3. Should errors be surfaced to the user (UI messages, HTTP error codes) or just logged internally?
4. Is there a logging library or error tracking tool (e.g. Sentry) already in use that I should integrate with?
```

---

## Anti-patterns to avoid

- ❌ Asking more than 5 questions in one round — it's overwhelming
- ❌ Re-asking questions the user already answered
- ❌ Asking vague meta-questions like "What do you want this to do?" — be specific
- ❌ Generating partial code "to show what I mean" before clarity is reached
- ❌ Asking questions that don't affect how you'd write the code
- ❌ More than 2 follow-up rounds — make a stated assumption and proceed
