import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK (uses GOOGLE_APPLICATION_CREDENTIALS env var or ADC)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

export const db = admin.firestore();
export const storage = admin.storage();
export const auth = admin.auth();
export default admin;
