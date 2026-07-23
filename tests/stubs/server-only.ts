// The real "server-only" package throws on import outside a React server
// context. Tests run in plain node, so vitest.config.ts aliases it here.
export {};
