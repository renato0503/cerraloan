// auth.js - CerraLoan
console.log('auth.js carregado. auth disponível:', typeof auth !== 'undefined');

// Se auth não existir, algo está errado com a ordem dos scripts
if (typeof auth === 'undefined') {
    console.error('❌ ERRO CRÍTICO: variável auth não está definida!');
    console.error('Verifique a ordem dos scripts no index.html');
    console.error('firebase-config.js DEVE carregar ANTES de auth.js');
}

// Login
async function login(email, password) {
    try {
        if(typeof showLoading === 'function') showLoading();
        console.log('Tentando login:', email);
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('Login OK:', userCredential.user.email);
        return userCredential.user;
    } catch (error) {
        if(typeof hideLoading === 'function') hideLoading();
        console.error('Erro no login:', error.code, error.message);
        const msg = typeof translateAuthError === 'function' ? translateAuthError(error.code) : error.message;
        if(typeof showToast === 'function') showToast(msg, 'error');
        throw error;
    }
}

// Logout
async function handleLogout() {
    const confirmed = window.confirm('Tem certeza que deseja sair?');
    if (confirmed) {
        try {
            if(typeof showLoading === 'function') showLoading();
            await auth.signOut();
            if(typeof hideLoading === 'function') hideLoading();
            console.log('Logout realizado');
            location.hash = '#login';
        } catch (error) {
            if(typeof hideLoading === 'function') hideLoading();
            console.error('Erro no logout:', error);
            if(typeof showToast === 'function') showToast('Erro ao sair', 'error');
        }
    }
}

window.handleLogout = handleLogout;
window.logout = handleLogout; // Maintain compatibility

// Listener de mudança de auth
function onAuthChange(callback) {
    console.log('Registrando onAuthChange listener');
    auth.onAuthStateChanged(callback);
}

// Pegar user atual
function getCurrentUser() {
    return auth.currentUser;
}

// Buscar role do usuário no Firestore
async function getUserRole(uid) {
    try {
        console.log('Buscando role para UID:', uid);
        const doc = await db.collection('users').doc(uid).get();
        if (doc.exists) {
            const role = doc.data().role;
            console.log('Role encontrada:', role);
            return role;
        } else {
            console.error('❌ Documento users/' + uid + ' NÃO EXISTE no Firestore!');
            return null;
        }
    } catch (error) {
        console.error('Erro ao buscar role:', error);
        return null;
    }
}

// Traduzir erros do Firebase Auth para PT-BR
function translateAuthError(code) {
    const map = {
        'auth/wrong-password': 'Senha incorreta',
        'auth/user-not-found': 'Usuário não encontrado',
        'auth/email-already-in-use': 'Este email já está em uso',
        'auth/weak-password': 'Senha fraca (mínimo 6 caracteres)',
        'auth/invalid-email': 'Email inválido',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde.',
        'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
        'auth/requires-recent-login': 'Faça login novamente para alterar a senha.',
        'auth/invalid-credential': 'Email ou senha incorretos',
    };
    return map[code] || 'Erro: ' + code;
}
