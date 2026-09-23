/**
 * Utility for simulating realistic network latency & tactile micro-loading states.
 * Generates organic, non-uniform delays between 0.4s and 1.0s (400ms - 1000ms).
 */

export const getRandomDelay = (minMs = 400, maxMs = 1000): number => {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
};

export const simulateDelay = (minMs = 400, maxMs = 1000): Promise<number> => {
  const delay = getRandomDelay(minMs, maxMs);
  return new Promise((resolve) => setTimeout(() => resolve(delay), delay));
};
