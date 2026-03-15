import firestoreService, { Job } from '../db/firestore';
import monitoringService from '../services/monitoringService';

const MAX_RETRIES = 3;

class JobQueue {
  /** Process all pending jobs from Firestore. */
  async processJobs(): Promise<void> {
    const pendingJobs = await firestoreService.getAllJobs('pending');

    for (const job of pendingJobs) {
      const startTime = Date.now();
      try {
        await firestoreService.updateJob(job.id!, { status: 'processing', startedAt: new Date() });
        await this.executeJob(job);

        const duration = Date.now() - startTime;
        await firestoreService.updateJob(job.id!, {
          status: 'completed',
          completedAt: new Date(),
          duration,
        });

        await monitoringService.recordJobMetrics(job.id!, {
          status: 'success',
          duration,
          agent: job.type,
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const duration = Date.now() - startTime;

        await firestoreService.updateJob(job.id!, {
          status: 'failed',
          error: error.message,
          failedAt: new Date(),
          duration,
          retryCount: (job.retryCount ?? 0) + 1,
        });

        await monitoringService.logError(job.id!, error, `Job Processing - ${job.type}`);

        if ((job.retryCount ?? 0) < MAX_RETRIES) {
          await this.scheduleRetry(job);
        }
      }
    }
  }

  /**
   * Execute a single job by dispatching to the appropriate agent stub.
   * Each case represents one stage in the AI video generation pipeline.
   */
  async executeJob(job: Job): Promise<void> {
    const jobId = job.id!;
    switch (job.type) {
      case 'topic':
        console.log(`[${jobId}] Running topic agent`);
        break;
      case 'script':
        console.log(`[${jobId}] Running script agent`);
        break;
      case 'thumbnail':
        console.log(`[${jobId}] Running thumbnail agent`);
        break;
      case 'voice':
        console.log(`[${jobId}] Running voice agent`);
        break;
      case 'visual':
        console.log(`[${jobId}] Running visual agent`);
        break;
      case 'mix':
        console.log(`[${jobId}] Running mix agent`);
        break;
      case 'render':
        console.log(`[${jobId}] Running render agent`);
        break;
      case 'publish':
        console.log(`[${jobId}] Running publish agent`);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  /**
   * Schedule a retry for a failed job by storing a future `retryAt` timestamp in Firestore.
   * The scheduled Cloud Function will pick it up when the timestamp is in the past.
   */
  private async scheduleRetry(job: Job): Promise<void> {
    const delayMs = Math.pow(2, job.retryCount ?? 0) * 1000;
    const retryAt = new Date(Date.now() + delayMs);
    await firestoreService.updateJob(job.id!, { status: 'pending', retryAt });
  }
}

export default new JobQueue();
