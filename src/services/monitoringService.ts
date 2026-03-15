import * as Sentry from '@sentry/node';
import fetch from 'node-fetch';
import { db } from '../config/firebase';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'production',
  tracesSampleRate: 1.0,
});

export class MonitoringService {
  /** Capture an error in Sentry, log it to Firestore, and send a Slack alert. */
  async logError(jobId: string, error: Error, context: string): Promise<void> {
    // 1. Sentry
    Sentry.captureException(error, {
      tags: { jobId, context },
      contexts: { job: { id: jobId, context } },
    });

    // 2. Firestore error log
    await db.collection('error_logs').add({
      jobId,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date(),
      severity: 'high',
    });

    // 3. Slack notification
    await this.sendSlackAlert({ jobId, error: error.message, context, severity: 'high' });
  }

  /** Record job execution metrics to Firestore. */
  async recordJobMetrics(
    jobId: string,
    metrics: { status: string; duration: number; agent?: string; [key: string]: unknown },
  ): Promise<void> {
    await db.collection('job_metrics').add({
      jobId,
      timestamp: new Date(),
      ...metrics,
    });
  }

  /** Log Cloud Function execution performance to Firestore. */
  async trackFunctionPerformance(functionName: string, duration: number): Promise<void> {
    await db.collection('performance_logs').add({
      function: functionName,
      duration,
      timestamp: new Date(),
      region: process.env.FUNCTION_REGION,
    });
  }

  /** Send a structured alert to the configured Slack webhook. */
  async sendSlackAlert(message: {
    jobId: string;
    error: string;
    context: string;
    severity: string;
  }): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    const payload = {
      text: `🚨 Job Alert: ${message.jobId}`,
      attachments: [
        {
          color: 'danger',
          fields: [
            { title: 'Job ID', value: message.jobId, short: true },
            { title: 'Error', value: message.error, short: false },
            { title: 'Context', value: message.context, short: true },
            { title: 'Severity', value: message.severity, short: true },
          ],
        },
      ],
    };

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('Failed to send Slack alert:', err);
    }
  }
}

export default new MonitoringService();
