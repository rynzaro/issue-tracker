# Task.projectId required

`projectId` is now mandatory on `Task`. Every task belongs to exactly one project. Eliminates the inference chain for ownership (Task → Project → User) and ensures consistent hierarchy.
