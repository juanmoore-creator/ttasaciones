import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCxlL7R7wke6VKnU-GysFi4dl76_0hApZ4",
    authDomain: "ttasaciones-5ce4d.firebaseapp.com",
    projectId: "ttasaciones-5ce4d",
    storageBucket: "ttasaciones-5ce4d.firebasestorage.app",
    messagingSenderId: "779321924202",
    appId: "1:779321924202:web:809fcfd276dfc2b3c98813",
    measurementId: "G-P1TSNB7NNZ"
};

let db: any;
let auth: any;
const googleProvider = new GoogleAuthProvider();

try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    // Enable Offline Persistence
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Persistence failed: Multiple tabs open.');
        } else if (err.code == 'unimplemented') {
            console.warn('Persistence not supported by browser.');
        }
    });

    console.log("Firebase Initialized with Persistence");
} catch (e) {
    console.error("Firebase Initialization Failed:", e);
}

export { db, auth, googleProvider };
