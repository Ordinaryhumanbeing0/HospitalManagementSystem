import { FifoQueue } from './appointment-queue';

export interface AsyncTask<T> {
  id: string;
  timestamp: number;
  execute: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

/**
 * Billing Request FIFO Queue
 * Guarantees serial execution of billing operations and payment deductions
 * preventing race conditions on bill balances.
 */
export class BillingRequestQueue {
  private queue: FifoQueue<AsyncTask<any>>;
  private isProcessing: boolean = false;
  private totalProcessed: number = 0;
  private totalSuccessful: number = 0;
  private totalErrors: number = 0;

  constructor() {
    this.queue = new FifoQueue<AsyncTask<any>>();
  }

  public async enqueueTask<T>(taskId: string, taskFn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task: AsyncTask<T> = {
        id: taskId,
        timestamp: Date.now(),
        execute: taskFn,
        resolve,
        reject,
      };

      this.queue.enqueue(task);
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.isEmpty()) {
      return;
    }

    this.isProcessing = true;
    const currentTask = this.queue.dequeue();

    if (!currentTask) {
      this.isProcessing = false;
      return;
    }

    try {
      const result = await currentTask.execute();
      this.totalProcessed++;
      this.totalSuccessful++;
      currentTask.resolve(result);
    } catch (err) {
      this.totalProcessed++;
      this.totalErrors++;
      currentTask.reject(err);
    } finally {
      this.isProcessing = false;
      if (!this.queue.isEmpty()) {
        this.processNext();
      }
    }
  }

  public getStats() {
    return {
      pending: this.queue.size(),
      totalProcessed: this.totalProcessed,
      totalSuccessful: this.totalSuccessful,
      totalErrors: this.totalErrors,
      isProcessing: this.isProcessing,
    };
  }
}

/**
 * Notification Request FIFO Queue
 * Orders and dispatches multi-channel notification events chronologically.
 */
export class NotificationRequestQueue {
  private queue: FifoQueue<AsyncTask<any>>;
  private isProcessing: boolean = false;
  private totalProcessed: number = 0;

  constructor() {
    this.queue = new FifoQueue<AsyncTask<any>>();
  }

  public async enqueueTask<T>(taskId: string, taskFn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task: AsyncTask<T> = {
        id: taskId,
        timestamp: Date.now(),
        execute: taskFn,
        resolve,
        reject,
      };

      this.queue.enqueue(task);
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.isEmpty()) {
      return;
    }

    this.isProcessing = true;
    const task = this.queue.dequeue();

    if (!task) {
      this.isProcessing = false;
      return;
    }

    try {
      const result = await task.execute();
      this.totalProcessed++;
      task.resolve(result);
    } catch (err) {
      task.reject(err);
    } finally {
      this.isProcessing = false;
      if (!this.queue.isEmpty()) {
        this.processNext();
      }
    }
  }

  public getStats() {
    return {
      pending: this.queue.size(),
      totalProcessed: this.totalProcessed,
      isProcessing: this.isProcessing,
    };
  }
}

// Global singletons
export const billingQueue = new BillingRequestQueue();
export const notificationQueue = new NotificationRequestQueue();
