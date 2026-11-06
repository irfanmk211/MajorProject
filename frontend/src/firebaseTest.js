import { db } from "./firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

export const testFirebase = async () => {
  try {
    // Add a test document
    const docRef = await addDoc(collection(db, "connection_test"), {
      message: "AgroSmart Firebase Connected",
      timestamp: new Date()
    });

    console.log("Document added with ID:", docRef.id);

    // Read documents
    const snapshot = await getDocs(collection(db, "connection_test"));

    snapshot.forEach((doc) => {
      console.log(doc.id, doc.data());
    });

    console.log("Firebase connection successful!");
  } catch (error) {
    console.error("Firebase connection failed:", error);
  }
};