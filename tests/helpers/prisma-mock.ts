import { vi } from "vitest";

function mockMethods() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  };
}

export function createMockPrismaClient() {
  return {
    user: mockMethods(),
    project: mockMethods(),
    projectSettings: mockMethods(),
    task: mockMethods(),
    activeTimer: mockMethods(),
    timeEntry: mockMethods(),
    todoItem: mockMethods(),
    taskEvent: mockMethods(),
    tag: mockMethods(),
    taskTag: mockMethods(),
    checkpoint: mockMethods(),
    checkpointTask: mockMethods(),
    $transaction: vi.fn((fn: (tx: any) => any) => {
      // By default, pass the mock client itself as the transaction client
      return fn(mockTx);
    }),
  };
}

// Transaction mock — same shape, used inside $transaction callbacks
const mockTx = {
  user: mockMethods(),
  project: mockMethods(),
  projectSettings: mockMethods(),
  task: mockMethods(),
  activeTimer: mockMethods(),
  timeEntry: mockMethods(),
  todoItem: mockMethods(),
  taskEvent: mockMethods(),
  tag: mockMethods(),
  taskTag: mockMethods(),
  checkpoint: mockMethods(),
  checkpointTask: mockMethods(),
};

export { mockTx };
export type MockPrismaClient = ReturnType<typeof createMockPrismaClient>;
export type MockTx = typeof mockTx;
