import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Scheduled Cloud Function — runs every 2 minutes to process pending jobs.
 */
export const processJobs = functions.pubsub
  .schedule('every 2 minutes')
  .onRun(async (_context) => {
    const startTime = Date.now();
    try {
      // Fetch pending jobs that are ready to run (new or past their retry delay)
      const now = new Date();
      const snap = await db
        .collection('jobs')
        .where('status', '==', 'pending')
        .get();

      const readyJobs = snap.docs.filter((doc) => {
        const retryAt = doc.data().retryAt?.toDate?.() as Date | undefined;
        return !retryAt || retryAt <= now;
      });

      console.log(`Processing ${readyJobs.length} pending job(s)...`);

      for (const doc of readyJobs) {
        await doc.ref.update({ status: 'processing', startedAt: new Date() });
        // Detailed processing is handled by the backend service (jobQueue).
        console.log(`Dispatched job ${doc.id}`);
      }

      const duration = Date.now() - startTime;
      await db.collection('performance_logs').add({
        function: 'processJobs',
        duration,
        timestamp: new Date(),
        jobsProcessed: readyJobs.length,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      await db.collection('error_logs').add({
        jobId: 'SYSTEM',
        error: error.message,
        stack: error.stack,
        context: 'Cloud Function: processJobs',
        timestamp: new Date(),
        severity: 'high',
      });
      throw err;
    }
  });

/**
 * Storage trigger — fires when a new video is uploaded to Cloud Storage.
 * Records metadata in Firestore and triggers downstream processing.
 */
export const onVideoUploaded = functions.storage
  .object()
  .onFinalize(async (object) => {
    const filePath = object.name ?? '';
    if (!filePath.startsWith('videos/') || !filePath.endsWith('/output.mp4')) {
      return null;
    }

    const startTime = Date.now();
    const videoId = filePath.split('/')[1];

    await db.collection('uploads').add({
      videoId,
      filePath,
      contentType: object.contentType,
      size: object.size,
      bucket: object.bucket,
      uploadedAt: new Date(),
    });

    const duration = Date.now() - startTime;
    await db.collection('performance_logs').add({
      function: 'onVideoUploaded',
      duration,
      videoId,
      timestamp: new Date(),
    });

    return null;
  });
