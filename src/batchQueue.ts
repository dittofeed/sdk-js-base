// Generic type for the executeBatch function
export type BatchFunction<T> = (tasks: T[]) => Promise<void>;

export type SetTimeout<T> = (handler: () => void, timeout: number) => T;
export type ClearTimeout<T> = (handle: T) => void;

// Generic class that takes a task type T
export class BatchQueue<Q, T> {
  private queue: Q[]; // The queue to hold the tasks
  private batchSize: number; // The maximum size of a batch
  private timeout: number; // The timeout in milliseconds
  private timeoutHandle: T | null; // Handle for the timeout, null when there's no active timeout
  private executeBatch: BatchFunction<Q>; // The function to execute a batch of tasks
  private setTimeout: SetTimeout<T>; // The function to set a timeout
  private clearTimeout: ClearTimeout<T>; // The function to clear a timeout
  private pending: Promise<void> | null;
  private baseDelay: number;
  private retries: number;

  constructor({
    batchSize,
    timeout, // default timeout is 500ms
    executeBatch,
    setTimeout,
    clearTimeout,
    baseDelay,
    retries,
  }: {
    batchSize: number;
    timeout: number;
    executeBatch: BatchFunction<Q>;
    setTimeout: SetTimeout<T>;
    clearTimeout: ClearTimeout<T>;
    baseDelay?: number;
    retries?: number;
  }) {
    this.queue = [];
    this.batchSize = batchSize;
    this.timeout = timeout;
    this.timeoutHandle = null;
    this.executeBatch = executeBatch;
    this.setTimeout = setTimeout;
    this.clearTimeout = clearTimeout;
    this.pending = null;
    this.baseDelay = baseDelay ?? 500;
    this.retries = retries ?? 5;
  }

  // Method to add a task to the queue
  submit(task: Q): void {
    this.queue.push(task); // Add the task to the queue

    // If we've reached batch size, process the queue
    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
    // If this is the first task added after the queue was processed, start the timeout
    else if (this.queue.length === 1) {
      this.startTimer();
    }
  }

  // Start a timeout that will process the queue when it triggers
  private startTimer(): void {
    this.timeoutHandle = this.setTimeout(() => this.flush(), this.timeout);
  }

  // Clear the current timeout
  private clearTimer(): void {
    if (this.timeoutHandle) {
      this.clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  // Process the queue by executing the batch function with the current batch, then remove the batch from the queue
  async flush(): Promise<void> {
    this.clearTimer(); // Clear any existing timeout

    // If the queue is empty, there's nothing to process
    if (this.queue.length === 0) {
      return;
    }

    // If there's a pending flush, wait for it to complete
    if (this.pending) {
      return this.pending;
    }
    try {
      // Otherwise, start a new flush
      this.pending = this.flushInner();
      // Wait for the flush to complete
      await this.pending;
    } catch (error) {
      throw error;
    } finally {
      // Reset the pending flag
      this.pending = null;
    }
  }

  // The inner function that actually performs the flush
  private async flushInner(): Promise<void> {
    while (this.queue.length > 0) {
      const batch = this.queue.slice(0, this.batchSize);
      this.queue = this.queue.slice(this.batchSize);
      await this.executeBatchWithRetry(batch);
    }
  }

  private async executeBatchWithRetry(batch: Q[]): Promise<void> {
    await this.retryWithExponentialBackoff(async () => {
      await this.executeBatch(batch);
    });
  }

  private async retryWithExponentialBackoff<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    // Ensure maxRetries is not negative
    const maxRetries = Math.max(0, this.retries);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error; // Rethrow the error on the last attempt
        }

        const delay = this.baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error("This line should never be reached");
  }
}
