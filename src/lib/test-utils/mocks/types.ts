import type { Mock } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MockFn = Mock<(...args: any[]) => any>;
