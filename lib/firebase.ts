import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyAYznM_TjQzH1rmQXh2aGOIINzcFmYNLt8',
  authDomain: 'mohona-zeiterfassung.firebaseapp.com',
  projectId: 'mohona-zeiterfassung',
  storageBucket: 'mohona-zeiterfassung.firebasestorage.app',
  messagingSenderId: '464874182736',
  appId: '1:464874182736:web:15076187c9eb7bb6951955',
}

// Prevent duplicate app initialization in Next.js dev mode
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const auth = getAuth(app)
export const db = getFirestore(app)
