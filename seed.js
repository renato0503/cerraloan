const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seed() {
    console.log('Criando usuarios...');

    await db.collection('users').doc('N9HIo1bkXkSS2QqjiPBVRbF2dy02').set({
        email: 'admin@admin.com',
        name: 'Administrador',
        role: 'admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Admin criado!');

    await db.collection('users').doc('Hoskl9Qt5eSE7fGJLEDK0yJPEGd2').set({
        email: 'cliente@cliente.com',
        name: 'Cliente Teste',
        cpf: '12345678900',
        phone: '11999999999',
        role: 'client',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Cliente criado!');

    console.log('Criando configuracoes...');
    await db.collection('settings').doc('general').set({
        companyName: 'CerraLoan',
        companyPhone: '62999999999',
        defaultDailyRate: 0.005
    });
    console.log('Configuracoes criadas!');

    console.log('\n=== Seed completo! ===');
    process.exit(0);
}

seed().catch(err => {
    console.error('Erro:', err);
    process.exit(1);
});
