function renderLogin() {
    return `
        <div class="page form-page">
            <div class="login-container">
                <div class="login-emoji">🏦</div>
                <h1 class="login-title">CerraLoan</h1>
                <p class="login-subtitle">Gestão de Microcrédito</p>
                
                <form id="login-form">
                    <div class="input-group">
                        <input type="email" id="email" placeholder="seu@email.com" required>
                    </div>
                    <div class="input-group">
                        <input type="password" id="password" placeholder="Sua senha" required>
                    </div>
                    <div id="login-error" class="login-error" style="display: none;"></div>
                    <button type="submit" class="btn btn-primary btn-block" id="login-btn">Entrar</button>
                </form>
                
                <div id="login-spinner" class="login-spinner" style="display: none;">
                    <div class="spinner"></div>
                </div>
            </div>
        </div>
    `;
}

function renderDashboard() {
    return `
        <div class="page">
            <div class="header">
                <h1>Dashboard</h1>
                <p class="subtitle">Visão geral do seu negócio</p>
            </div>
            
            <div class="stat-grid">
                <div class="stat-card">
                    <div class="stat-value">R$ 12.500</div>
                    <div class="stat-label">Total Emprestado</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">8</div>
                    <div class="stat-label">Clientes Ativos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">R$ 2.150</div>
                    <div class="stat-label">Recebido este Mês</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">2</div>
                    <div class="stat-label">Pendentes</div>
                </div>
            </div>
            
            <h2 class="mt-3 mb-2" style="font-size: 18px;">Ações Rápidas</h2>
            <div class="dashboard-grid">
                <a href="#clients" class="dashboard-card">
                    <div class="dashboard-card-icon">👤</div>
                    <div class="dashboard-card-label">Novo Cliente</div>
                </a>
                <a href="#loans" class="dashboard-card">
                    <div class="dashboard-card-icon">💸</div>
                    <div class="dashboard-card-label">Novo Empréstimo</div>
                </a>
                <a href="#simulator" class="dashboard-card">
                    <div class="dashboard-card-icon">🧮</div>
                    <div class="dashboard-card-label">Simular</div>
                </a>
                <a href="#loans" class="dashboard-card">
                    <div class="dashboard-card-icon">📊</div>
                    <div class="dashboard-card-label">Relatórios</div>
                </a>
            </div>
            
            <h2 class="mt-3 mb-2" style="font-size: 18px;">Empréstimos Recentes</h2>
            <div class="card">
                <div class="list-item" style="box-shadow: none; padding: 8px 0;">
                    <div class="list-item-avatar">JS</div>
                    <div class="list-item-content">
                        <div class="list-item-title">João Silva</div>
                        <div class="list-item-subtitle">6x de R$ 308,33</div>
                    </div>
                    <span class="list-item-badge badge-success">Ativo</span>
                </div>
                <div class="list-item" style="box-shadow: none; padding: 8px 0;">
                    <div class="list-item-avatar">MS</div>
                    <div class="list-item-content">
                        <div class="list-item-title">Maria Santos</div>
                        <div class="list-item-subtitle">12x de R$ 325,00</div>
                    </div>
                    <span class="list-item-badge badge-warning">Pendente</span>
                </div>
            </div>
        </div>
    `;
}

function renderClients() {
    return `
        <div class="page">
            <div class="header">
                <h1>Clientes</h1>
                <p class="subtitle">Gerencie seus clientes</p>
            </div>
            
            <div class="card">
                <div class="input-group" style="margin-bottom: 0;">
                    <input type="text" placeholder="Buscar cliente..." id="search-client">
                </div>
            </div>
            
            <div id="clients-list">
                <a href="#" class="list-item">
                    <div class="list-item-avatar">JS</div>
                    <div class="list-item-content">
                        <div class="list-item-title">João Silva</div>
                        <div class="list-item-subtitle">(11) 99999-0000</div>
                    </div>
                </a>
                <a href="#" class="list-item">
                    <div class="list-item-avatar">MS</div>
                    <div class="list-item-content">
                        <div class="list-item-title">Maria Santos</div>
                        <div class="list-item-subtitle">(11) 99999-1111</div>
                    </div>
                </a>
                <a href="#" class="list-item">
                    <div class="list-item-avatar">PO</div>
                    <div class="list-item-content">
                        <div class="list-item-title">Pedro Oliveira</div>
                        <div class="list-item-subtitle">(11) 99999-2222</div>
                    </div>
                </a>
            </div>
            
            <button class="btn btn-primary btn-block mt-3" id="add-client-btn">+ Novo Cliente</button>
        </div>
    `;
}

function renderLoans() {
    return `
        <div class="page">
            <div class="header">
                <h1>Empréstimos</h1>
                <p class="subtitle">Histórico de empréstimos</p>
            </div>
            
            <div class="card">
                <div class="input-group" style="margin-bottom: 0;">
                    <input type="text" placeholder="Buscar empréstimo..." id="search-loan">
                </div>
            </div>
            
            <div id="loans-list">
                <a href="#loan-detail" class="list-item">
                    <div class="list-item-avatar">JS</div>
                    <div class="list-item-content">
                        <div class="list-item-title">João Silva</div>
                        <div class="list-item-subtitle">R$ 1.500 • 6x de R$ 308,33</div>
                    </div>
                    <span class="list-item-badge badge-success">Ativo</span>
                </a>
                <a href="#loan-detail" class="list-item">
                    <div class="list-item-avatar">MS</div>
                    <div class="list-item-content">
                        <div class="list-item-title">Maria Santos</div>
                        <div class="list-item-subtitle">R$ 3.000 • 12x de R$ 325,00</div>
                    </div>
                    <span class="list-item-badge badge-warning">Pendente</span>
                </a>
                <a href="#loan-detail" class="list-item">
                    <div class="list-item-avatar">PO</div>
                    <div class="list-item-content">
                        <div class="list-item-title">Pedro Oliveira</div>
                        <div class="list-item-subtitle">R$ 1.000 • 4x de R$ 300,00</div>
                    </div>
                    <span class="list-item-badge badge-success">Quitado</span>
                </a>
            </div>
            
            <button class="btn btn-primary btn-block mt-3" id="new-loan-btn">+ Novo Empréstimo</button>
        </div>
    `;
}

function renderLoanDetail() {
    return `
        <div class="page">
            <div class="header">
                <h1>Detalhes do Empréstimo</h1>
                <p class="subtitle">Informações completas</p>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <span class="card-title">Dados do Cliente</span>
                </div>
                <div style="display: flex; align-items: center;">
                    <div class="list-item-avatar" style="width: 56px; height: 56px; font-size: 20px;">JS</div>
                    <div>
                        <div style="font-weight: 600; font-size: 18px;">João Silva</div>
                        <div style="color: var(--text-light);">CPF: 123.456.789-00</div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <span class="card-title">Dados do Empréstimo</span>
                </div>
                <div class="simulator-row">
                    <span class="label">Valor Solicitado</span>
                    <span class="value">R$ 1.500,00</span>
                </div>
                <div class="simulator-row">
                    <span class="label">Taxa de Juros</span>
                    <span class="value">5% ao mês</span>
                </div>
                <div class="simulator-row">
                    <span class="label">Parcelas</span>
                    <span class="value">6x</span>
                </div>
                <div class="simulator-row">
                    <span class="label">Valor Total</span>
                    <span class="value" style="color: var(--accent);">R$ 1.850,00</span>
                </div>
                <div class="simulator-row">
                    <span class="label">Parcela Mensal</span>
                    <span class="value" style="color: var(--success);">R$ 308,33</span>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <span class="card-title">Status</span>
                </div>
                <span class="list-item-badge badge-success" style="font-size: 14px; padding: 8px 16px;">Em Dia</span>
            </div>
            
            <div style="display: flex; gap: 12px; margin-top: 20px;">
                <button class="btn btn-outline btn-block">Editar</button>
                <button class="btn btn-primary btn-block">Receber Parcela</button>
            </div>
        </div>
    `;
}

function renderSimulator() {
    return `
        <div class="page form-page">
            <div class="header">
                <h1>Simulador</h1>
                <p class="subtitle">Calcule o empréstimo</p>
            </div>
            
            <form id="simulator-form" style="padding: 0 16px;">
                <div class="card">
                    <div class="input-group">
                        <label>Valor do Empréstimo (R$)</label>
                        <input type="number" id="sim-amount" placeholder="1000" value="1000" min="100" max="50000">
                    </div>
                    <div class="input-group">
                        <label>Taxa de Juros (% ao mês)</label>
                        <input type="number" id="sim-rate" placeholder="5" value="5" min="0.5" max="20" step="0.1">
                    </div>
                    <div class="input-group">
                        <label>Número de Parcelas</label>
                        <select id="sim-installments">
                            <option value="1">1x</option>
                            <option value="2">2x</option>
                            <option value="3">3x</option>
                            <option value="4">4x</option>
                            <option value="5">5x</option>
                            <option value="6" selected>6x</option>
                            <option value="12">12x</option>
                            <option value="24">24x</option>
                        </select>
                    </div>
                </div>
                
                <button type="submit" class="btn btn-primary btn-block">Calcular</button>
                
                <div id="simulator-result" style="display: none;">
                    <div class="simulator-result">
                        <div class="label">Valor Total a Pagar</div>
                        <div class="value" id="result-total">R$ 1.300,00</div>
                        <div class="label">Parcela Mensal</div>
                        <div class="value" id="result-monthly">R$ 216,67</div>
                    </div>
                    <div class="card simulator-details">
                        <div class="simulator-row">
                            <span class="label">Valor Solicitado</span>
                            <span class="value" id="detail-principal">R$ 1.000,00</span>
                        </div>
                        <div class="simulator-row">
                            <span class="label">Total de Juros</span>
                            <span class="value" id="detail-interest" style="color: var(--accent);">R$ 300,00</span>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    `;
}

function initSimulator() {
    const form = document.getElementById('simulator-form');
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const amount = parseFloat(document.getElementById('sim-amount').value) || 1000;
        const rate = parseFloat(document.getElementById('sim-rate').value) || 5;
        const installments = parseInt(document.getElementById('sim-installments').value) || 6;
        
        const total = amount * (1 + (rate / 100) * installments);
        const monthly = total / installments;
        const interest = total - amount;
        
        document.getElementById('result-total').textContent = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        document.getElementById('result-monthly').textContent = `R$ ${monthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        document.getElementById('detail-principal').textContent = `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        document.getElementById('detail-interest').textContent = `R$ ${interest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        
        document.getElementById('simulator-result').style.display = 'block';
    });
}

window.initSimulator = initSimulator;

async function initLogin() {
    const form = document.getElementById('login-form');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');
        const spinner = document.getElementById('login-spinner');
        const btn = document.getElementById('login-btn');
        
        errorDiv.style.display = 'none';
        spinner.style.display = 'block';
        btn.disabled = true;
        
        try {
            await login(email, password);
        } catch (error) {
            spinner.style.display = 'none';
            btn.disabled = false;
            errorDiv.textContent = 'Email ou senha incorretos';
            errorDiv.style.display = 'block';
        }
    });
}

window.initLogin = initLogin;

function translateAuthError(code) {
    const map = {
        'auth/wrong-password': 'Senha incorreta',
        'auth/user-not-found': 'Usuario nao encontrado',
        'auth/email-already-in-use': 'Este email ja esta em uso',
        'auth/weak-password': 'Senha fraca (minimo 6 caracteres)',
        'auth/invalid-email': 'Email invalido',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde.',
        'auth/network-request-failed': 'Sem conexao. Verifique sua internet.',
        'auth/requires-recent-login': 'Fac login novamente para alterar a senha.',
        'auth/invalid-credential': 'Credenciais invalidas',
    };
    return map[code] || 'Erro inesperado. Tente novamente.';
}

window.translateAuthError = translateAuthError;

function formatCPF(cpf) {
    if (!cpf) return '';
    const v = cpf.replace(/\D/g, '');
    if (v.length > 11) return v.slice(0, 11);
    if (v.length >= 10) return v.slice(0,3) + '.' + v.slice(3,6) + '.' + v.slice(6,9) + '-' + v.slice(9);
    if (v.length >= 7) return v.slice(0,3) + '.' + v.slice(3,6) + '.' + v.slice(6);
    if (v.length >= 4) return v.slice(0,3) + '.' + v.slice(3);
    return v;
}

function formatPhone(phone) {
    if (!phone) return '';
    const v = phone.replace(/\D/g, '');
    if (v.length > 11) return v.slice(0, 11);
    if (v.length >= 2) return '(' + v.slice(0,2) + ') ' + v.slice(2);
    return v;
}

function emptyState(emoji, title, subtitle, actionText, actionHash) {
    return `
        <div class="empty-state">
            <div class="empty-emoji">${emoji}</div>
            <h3>${title}</h3>
            <p>${subtitle}</p>
            ${actionText && actionHash ? `<a href="${actionHash}" class="btn btn-accent">${actionText}</a>` : ''}
        </div>
    `;
}

window.emptyState = emptyState;

function statusBadge(status) {
    const badges = {
        'active': '<span class="badge badge-active">🟢 Ativo</span>',
        'paid': '<span class="badge badge-paid">✅ Quitado</span>',
        'overdue': '<span class="badge badge-overdue">🔴 Atrasado</span>'
    };
    return badges[status] || '<span class="badge">' + status + '</span>';
}

window.statusBadge = statusBadge;

function showLoading() {
    let loader = document.getElementById('global-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.innerHTML = '<div class="spinner"></div>';
        loader.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center;z-index:9999;';
        document.body.appendChild(loader);
    }
    loader.style.display = 'flex';
}

function hideLoading() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.style.display = 'none';
}

window.showLoading = showLoading;
window.hideLoading = hideLoading;

function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

window.showToast = showToast;

function confirmDialog(message) {
    return confirm(message);
}

window.confirmDialog = confirmDialog;
