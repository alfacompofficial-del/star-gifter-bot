import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCB8wmf1x7eKUBpO-KtPrEQ9cst3OmJzxk",
  authDomain: "bilol-919db.firebaseapp.com",
  databaseURL: "https://bilol-919db-default-rtdb.firebaseio.com",
  projectId: "bilol-919db",
  storageBucket: "bilol-919db.firebasestorage.app",
  messagingSenderId: "801544235520",
  appId: "1:801544235520:android:7512b8ad742bd252ca86e5"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
