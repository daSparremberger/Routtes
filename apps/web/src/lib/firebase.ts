import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY             ?? 'AIzaSyAY8r828M3th-3zO-XPF6IkO8QMBYOOCwg',
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN         ?? 'routtes-app.firebaseapp.com',
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID          ?? 'routtes-app',
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET      ?? 'routtes-app.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '182429550514',
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID              ?? '1:182429550514:web:684de3da72587ebaa346ab',
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const auth = getAuth(app)
export default app
