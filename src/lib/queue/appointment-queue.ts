/**
 * Appointment Request FIFO Queue Data Structure
 * Explicitly implements the subject-wise Data Structures requirement:
 * "Queue for appointment requests"
 * 
 * Provides First-In, First-Out request queuing and synchronized execution
 * to ensure that simultaneous multi-user booking requests are received,
 * queued in exact chronological arrival order, and processed sequentially.
 */

export interface QueueNode<T> {
  data: T;
  next: QueueNode<T> | null;
}

export class FifoQueue<T> {
  private head: QueueNode<T> | null = null;
  private tail: QueueNode<T> | null = null;
  private length: number = 0;

  /**
   * Enqueue: Adds an item to the end (tail) of the queue. O(1)
   */
  public enqueue(item: T): void {
    const newNode: QueueNode<T> = { data: item, next: null };
    if (!this.tail) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      this.tail.next = newNode;
      this.tail = newNode;
    }
    this.length++;
  }

  /**
   * Dequeue: Removes and returns the first (head) item. O(1)
   */
  public dequeue(): T | null {
    if (!this.head) {
      return null;
    }
    const item = this.head.data;
    this.head = this.head.next;
    if (!this.head) {
      this.tail = null;
    }
    this.length--;
    return item;
  }

  /**
   * Peek: Inspects the front item without removing it. O(1)
   */
  public peek(): T | null {
    return this.head ? this.head.data : null;
  }

  /**
   * Size of the queue
   */
  public size(): number {
    return this.length;
  }

  /**
   * Check if queue is empty
   */
  public isEmpty(): boolean {
    return this.length === 0;
  }
}

export interface BookingTask<T> {
  id: string;
  timestamp: number;
  execute: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

export class AppointmentRequestQueue {
  private queue: FifoQueue<BookingTask<any>>;
  private isProcessing: boolean = false;
  private totalProcessed: number = 0;
  private totalSuccessful: number = 0;
  private totalErrors: number = 0;
  private peakQueueSize: number = 0;

  constructor() {
    this.queue = new FifoQueue<BookingTask<any>>();
  }

  /**
   * Enqueues an appointment booking request task and executes it in strict FIFO order.
   */
  public async enqueueTask<T>(taskId: string, taskFn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task: BookingTask<T> = {
        id: taskId,
        timestamp: Date.now(),
        execute: taskFn,
        resolve,
        reject,
      };

      this.queue.enqueue(task);

      if (this.queue.size() > this.peakQueueSize) {
        this.peakQueueSize = this.queue.size();
      }

      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    const nextTask = this.queue.dequeue();
    if (!nextTask) {
      return;
    }

    this.isProcessing = true;

    try {
      const result = await nextTask.execute();
      this.totalProcessed++;
      this.totalSuccessful++;
      nextTask.resolve(result);
    } catch (err) {
      this.totalProcessed++;
      this.totalErrors++;
      nextTask.reject(err);
    } finally {
      this.isProcessing = false;
      // Recursively process next item in FIFO queue
      this.processNext();
    }
  }

  /**
   * Returns operational queue metrics for testing and academic verification.
   */
  public getStats() {
    return {
      currentPending: this.queue.size(),
      totalProcessed: this.totalProcessed,
      totalSuccessful: this.totalSuccessful,
      totalErrors: this.totalErrors,
      peakQueueSize: this.peakQueueSize,
      isCurrentlyActive: this.isProcessing,
    };
  }
}

// Global Singleton for the application instance
const globalForQueue = globalThis as unknown as {
  appointmentQueue?: AppointmentRequestQueue;
};

export const appointmentQueue =
  globalForQueue.appointmentQueue ?? new AppointmentRequestQueue();

if (process.env.NODE_ENV !== 'production') {
  globalForQueue.appointmentQueue = appointmentQueue;
}
