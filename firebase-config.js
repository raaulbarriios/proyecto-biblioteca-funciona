// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyABx_foghToDYZfHFLNEiFLOzbpgHNpv4A",
  authDomain: "biblioteca-f9564.firebaseapp.com",
  projectId: "biblioteca-f9564",
  storageBucket: "biblioteca-f9564.firebasestorage.app",
  messagingSenderId: "489567213953",
  appId: "1:489567213953:web:65fcb9e7c0250b85d77080",
  measurementId: "G-WPF4GVM5TX"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Instancias globales
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();
