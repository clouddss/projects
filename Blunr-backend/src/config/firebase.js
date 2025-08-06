// Handle ES6 module paths
import firebaseAdmin from 'firebase-admin';
import serviceAccount from '../services/firebase-service-account.js';

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
});

export default firebaseAdmin;

