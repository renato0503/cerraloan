// app.js - CerraLoan
console.log('app.js carregado');
console.log('auth disponível:', typeof auth !== 'undefined');
console.log('db disponível:', typeof db !== 'undefined');

// Carregar tema salvo
const savedTheme = localStorage.getItem('cerraloan-theme');
if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
}

// Rotas exclusivas de admin
const ADMIN_ROUTES = ['#dashboard', '#clients', '#new-client', '#client-detail',
                       '#loans', '#new-loan', '#loan-detail', '#settings', '#proposals'];

// Rotas exclusivas de cliente
const CLIENT_ROUTES = ['#my-loans', '#my-loan-detail', '#profile', '#request-loan'];

// Rotas exclusivas de vendedor
const VENDEDOR_ROUTES = ['#vendedor-dashboard', '#new-proposal', '#my-proposals'];

function showAdminNav() {
    const adminNav = document.getElementById('admin-nav');
    const clientNav = document.getElementById('client-nav');
    const vendedorNav = document.getElementById('vendedor-nav');
    if (adminNav) adminNav.style.display = 'flex';
    if (clientNav) clientNav.style.display = 'none';
    if (vendedorNav) vendedorNav.style.display = 'none';
}

function showClientNav() {
    const adminNav = document.getElementById('admin-nav');
    const clientNav = document.getElementById('client-nav');
    const vendedorNav = document.getElementById('vendedor-nav');
    if (adminNav) adminNav.style.display = 'none';
    if (clientNav) clientNav.style.display = 'flex';
    if (vendedorNav) vendedorNav.style.display = 'none';
}

function showVendedorNav() {
    const adminNav = document.getElementById('admin-nav');
    const clientNav = document.getElementById('client-nav');
    const vendedorNav = document.getElementById('vendedor-nav');
    if (adminNav) adminNav.style.display = 'none';
    if (clientNav) clientNav.style.display = 'none';
    if (vendedorNav) vendedorNav.style.display = 'flex';
}

function hideNav() {
    const adminNav = document.getElementById('admin-nav');
    const clientNav = document.getElementById('client-nav');
    const vendedorNav = document.getElementById('vendedor-nav');
    if (adminNav) adminNav.style.display = 'none';
    if (clientNav) clientNav.style.display = 'none';
    if (vendedorNav) vendedorNav.style.display = 'none';
}

function homeRouteForRole(role) {
    if (role === 'admin') return '#dashboard';
    if (role === 'vendedor') return '#vendedor-dashboard';
    return '#my-loans';
}

// Highlight do item ativo na nav
function updateActiveNav(hash) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        const route = item.getAttribute('data-route');
        if (route && hash.includes(route)) {
            item.classList.add('active');
        }
    });
}

async function navigateTo(hash) {
    const route = hash.split('?')[0];
    const user = auth.currentUser;
    
    if (!user && route !== '#login') {
        location.hash = '#login';
        return;
    }
    
    if (user) {
        const role = await getUserRole(user.uid);
        const isOwnRoute = (role === 'admin' && ADMIN_ROUTES.includes(route)) ||
                            (role === 'client' && CLIENT_ROUTES.includes(route)) ||
                            (role === 'vendedor' && VENDEDOR_ROUTES.includes(route));
        const isRestrictedRoute = ADMIN_ROUTES.includes(route) || CLIENT_ROUTES.includes(route) || VENDEDOR_ROUTES.includes(route);

        // Usuário tentando acessar rota de outro papel → bloqueia
        if (isRestrictedRoute && !isOwnRoute) {
            console.warn(`${role} bloqueado de rota:`, route);
            location.hash = homeRouteForRole(role);
            return;
        }
    }
    
    // Atualizar nav bar ativa
    updateActiveNav(route);
    
    switch(route) {
        // Admin
        case '#dashboard':     typeof loadDashboard === 'function' && await loadDashboard(); break;
        case '#clients':       typeof loadClients === 'function' && await loadClients(); break;
        case '#new-client':    typeof loadNewClientForm === 'function' && await loadNewClientForm(); break;
        case '#client-detail': typeof loadClientDetail === 'function' && await loadClientDetail(); break;
        case '#loans':         typeof loadLoans === 'function' && await loadLoans(); break;
        case '#new-loan':      typeof loadNewLoanForm === 'function' && await loadNewLoanForm(); break;
        case '#loan-detail':   typeof loadLoanDetail === 'function' && await loadLoanDetail(); break;
        case '#settings':      typeof loadSettings === 'function' && await loadSettings(); break;
        
        // Cliente
        case '#my-loans':        typeof loadMyLoans === 'function' && await loadMyLoans(); break;
        case '#my-loan-detail':  typeof loadMyLoanDetail === 'function' && await loadMyLoanDetail(); break;
        case '#profile':         typeof loadProfile === 'function' && await loadProfile(); break;
        case '#request-loan':    typeof loadRequestLoan === 'function' && await loadRequestLoan(); break;

        // Vendedor
        case '#vendedor-dashboard': typeof loadVendedorDashboard === 'function' && await loadVendedorDashboard(); break;
        case '#new-proposal':       typeof loadNewProposal === 'function' && await loadNewProposal(); break;
        case '#my-proposals':       typeof loadMyProposals === 'function' && await loadMyProposals(); break;

        // Admin - propostas de vendedores
        case '#proposals':          typeof loadProposals === 'function' && await loadProposals(); break;

        // Compartilhado
        case '#login':           typeof loadLoginPage === 'function' && loadLoginPage(); break;

        default:
            if (user) {
                const role = await getUserRole(user.uid);
                location.hash = homeRouteForRole(role);
            } else {
                location.hash = '#login';
            }
    }
}

function getRoute() {
    return window.location.hash.split('?')[0] || '#login';
}

function getHashParam(param) {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.split('?')[1]);
    return params.get(param);
}

let currentUserRole = null;

async function render() {
    navigateTo(window.location.hash || '#login');
}

document.addEventListener('submit', function(e) {
    if (e.target.id === 'login-form') {
        e.preventDefault();
        handleLogin();
    }
});

async function handleLogin() {
    console.log('=== HANDLE LOGIN CHAMADO ===');
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    console.log('Tentando login com:', email);
    
    if (!email || !password) {
        if (typeof showToast === 'function') showToast('Preencha email e senha', 'error');
        return;
    }
    
    try {
        await login(email, password);
    } catch (err) {
        // erro já tratado no login()
    }
}

// Inicialização - esperar Firebase estar pronto
if (typeof auth !== 'undefined' && typeof db !== 'undefined') {
    console.log('Iniciando listener de autenticação...');
    
    onAuthChange(async (user) => {
        console.log('=== AUTH STATE CHANGED ===');
        console.log('User:', user ? user.email : 'NENHUM');
        
        if (user) {
            const role = await getUserRole(user.uid);
            console.log('Role:', role);
            
            if (role === 'admin') {
                if(typeof showAdminNav === 'function') showAdminNav(); else updateNav(getRoute());
                if(typeof hideLoading === 'function') hideLoading();
                if (!location.hash || location.hash === '#' || 
                    location.hash === '#login') {
                    location.hash = '#dashboard';
                }
            } else if (role === 'client') {
                if(typeof showClientNav === 'function') showClientNav(); else updateNav(getRoute());
                if(typeof hideLoading === 'function') hideLoading();
                if (!location.hash || location.hash === '#' ||
                    location.hash === '#login') {
                    location.hash = '#my-loans';
                }
            } else if (role === 'vendedor') {
                if(typeof showVendedorNav === 'function') showVendedorNav(); else updateNav(getRoute());
                if(typeof hideLoading === 'function') hideLoading();
                if (!location.hash || location.hash === '#' ||
                    location.hash === '#login') {
                    location.hash = '#vendedor-dashboard';
                }
            } else {
                console.error('❌ Role não encontrada para:', user.uid);
                if(typeof showToast === 'function') showToast('Erro: perfil não configurado', 'error');
                if(typeof hideLoading === 'function') hideLoading();
                await auth.signOut();
                location.hash = '#login';
            }
        } else {
            if(typeof hideNav === 'function') hideNav(); else updateNav('login');
            location.hash = '#login';
            if(typeof hideLoading === 'function') hideLoading();
        }
        render();
    });
} else {
    console.error('❌ Firebase NÃO inicializado! Verifique firebase-config.js');
    document.getElementById('app').innerHTML = `
        <div style="text-align:center; padding:40px; color:red;">
            <h2>❌ Erro de Inicialização</h2>
            <p>O Firebase não foi carregado corretamente.</p>
            <p>Verifique o console para mais detalhes.</p>
        </div>
    `;
}

window.addEventListener('hashchange', () => navigateTo(location.hash));
window.addEventListener('DOMContentLoaded', () => {
    // onAuthStateChanged goes here automatically on load
});

// Rotas legadas removidas
