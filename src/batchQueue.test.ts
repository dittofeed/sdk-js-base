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

      queue.submit(1);
      await queue.flush();
    });
  });
});
