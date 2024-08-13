import { BatchQueue } from "./batchQueue";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("batchQueue", () => {
  describe("flush", () => {
    test("should sync all events", async () => {
      const repository: number[] = [];
      const queue = new BatchQueue<number, ReturnType<typeof setTimeout>>({
        timeout: 500,
        batchSize: 5,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        executeBatch: async (batch) => {
          await sleep(300);
          for (const item of batch) {
            repository.push(item);
          }
        },
      });

      for (let i = 0; i < 10; i++) {
        queue.submit(i);
      }
      await queue.flush();
      expect(repository).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
  });
});
