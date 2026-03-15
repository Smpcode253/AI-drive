import { db } from '../config/firebase';
import { Timestamp } from 'firebase-admin/firestore';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
  id?: string;
  type: string;
  userId: string;
  status: JobStatus;
  retryCount: number;
  createdAt: Timestamp | Date;
  startedAt?: Timestamp | Date;
  completedAt?: Timestamp | Date;
  failedAt?: Timestamp | Date;
  duration?: number;
  error?: string;
  errorCode?: string;
  [key: string]: unknown;
}

const JOBS_COLLECTION = 'jobs';

/** Add a new job document to Firestore and return its generated ID. */
export async function addJob(job: Omit<Job, 'id'>): Promise<string> {
  const ref = await db.collection(JOBS_COLLECTION).add({
    ...job,
    createdAt: new Date(),
    retryCount: job.retryCount ?? 0,
  });
  return ref.id;
}

/** Retrieve a single job by ID. Returns null if not found. */
export async function getJob(jobId: string): Promise<Job | null> {
  const snap = await db.collection(JOBS_COLLECTION).doc(jobId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as Job;
}

/** Update fields on an existing job document. */
export async function updateJob(jobId: string, updates: Partial<Job>): Promise<void> {
  await db.collection(JOBS_COLLECTION).doc(jobId).update(updates as Record<string, unknown>);
}

/** Retrieve all jobs matching a given status. */
export async function getAllJobs(status: JobStatus): Promise<Job[]> {
  const snap = await db
    .collection(JOBS_COLLECTION)
    .where('status', '==', status)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Job));
}

export default { addJob, getJob, updateJob, getAllJobs };
