// Firebase Config - CerraLoan
const firebaseConfig = {
    apiKey: "AIzaSyB93BxvmL2796MnxX2aFVflBpu0PyKy1p4",
    authDomain: "cerraloan.firebaseapp.com",
    projectId: "cerraloan",
    storageBucket: "cerraloan.firebasestorage.app",
    messagingSenderId: "628596594708",
    appId: "1:628596594708:web:6026ddafc73c9fc6412f01"
};

// Inicializar Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Debug: confirmar inicialização
console.log('✅ Firebase inicializado');
console.log('✅ Auth disponível:', typeof auth !== 'undefined');
console.log('✅ Firestore disponível:', typeof db !== 'undefined');

window.firebase = firebase;
window.auth = auth;
window.db = db;
