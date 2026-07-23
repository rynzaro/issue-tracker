# Tags scoped per-user

`Tag.userId` added. Each user has their own tag vocabulary, reusable across all their projects. Enables cross-project analysis ("how are my backend estimates across all projects?"). `@@unique([name, userId])` prevents duplicate tag names per user.
