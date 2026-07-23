# Category → Tags (M:N)

Replaced `category: String?` with `Tag` model (many-to-many). Tasks span multiple concerns. Event: `CATEGORY_CHANGED` → `TAGS_CHANGED`, payload: `{ added: string[], removed: string[] }`.
