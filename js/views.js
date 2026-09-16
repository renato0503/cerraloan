// ==========================================
// CERRALOAN - VIEWS & ROUTING SYSTEM
// ==========================================

// ===== COMPARTILHADO =====
window.loadLoginPage = function() {
    const appDiv = document.getElementById('app');
    appDiv.innerHTML = `
        <div class="login-container">
            <div class="login-header">
                <div class="logo">${icon('bank')}</div>
                <h1>CerraLoan</h1>
            </div>
            <div class="card">
                <form id="login-form">
                    <div class="input-group">
                        <label>Email</label>
                        <input type="email" id="email" required>
                    </div>
                    <div class="input-group">
                        <label>Senha</label>
                        <input type="password" id="password" required>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">Entrar</button>
                </form>
            </div>
        </div>
    `;
};

// ===== HELPER: BADGES OTIMIZADOS =====
window.getLoanStatusDisplay = function(loan) {
    if (loan.status === 'paid') return `<span class="list-item-badge badge-paid" style="background:rgba(0,184,148,0.15);color:var(--success);">${icon('check-circle')} Quitado</span>`;
    if (loan.status === 'renegotiated') return `<span class="list-item-badge">${icon('refresh-cw')} Renegociado</span>`;

    const startDate = loan.startDate?.toDate ? loan.startDate.toDate() : new Date(loan.startDate);
    const dias = diasEntre(startDate, new Date());

    if (dias > 60) return `<span class="list-item-badge badge-overdue" style="background:rgba(214,48,49,0.15);color:var(--danger);">${icon('alert-triangle')} Crítico</span>`;
    if (dias > 30) return `<span class="list-item-badge badge-overdue" style="background:rgba(214,48,49,0.15);color:var(--danger);"><span class="status-dot"></span> Atrasado</span>`;
    if (dias > 15) return `<span class="list-item-badge badge-attention"><span class="status-dot"></span> Atenção</span>`;
    return `<span class="list-item-badge badge-active" style="background:rgba(0,184,148,0.15);color:var(--success);"><span class="status-dot"></span> Ativo</span>`;
};

// ===== HELPER: SCORE DE RISCO (Sprint 14 do roadmap) =====
window.scoreBadge = function(score) {
    if (!score || score.nivel === 'novo') {
        return `<span class="list-item-badge">${icon('info')} ${score ? score.label : 'Sem histórico'}</span>`;
    }
    if (score.nivel === 'bom') return `<span class="list-item-badge badge-success" style="background:rgba(0,184,148,0.15);color:var(--success);"><span class="status-dot"></span> ${score.label}</span>`;
    if (score.nivel === 'medio') return `<span class="list-item-badge badge-attention"><span class="status-dot"></span> ${score.label}</span>`;
    return `<span class="list-item-badge badge-danger" style="background:rgba(214,48,49,0.15);color:var(--danger);"><span class="status-dot"></span> ${score.label}</span>`;
};

// ===== ADMIN VIEWS =====

window.loadDashboard = async function() {
    const appDiv = document.getElementById('app');
    try {
        appDiv.innerHTML = `<div class="page-header"><h1>${icon('bank')} CerraLoan</h1><p>Bem-vindo, carregando...</p></div><div class="card skeleton-card" style="height:120px;margin:16px 0;"></div>`;
       
        const user = window.auth.currentUser;
        if (!user) { location.hash = '#login'; return; }
       
        const userDoc = await window.db.collection('users').doc(user.uid).get();
        const userName = userDoc.exists ? userDoc.data().name : 'Admin';
        const userRole = userDoc.exists ? userDoc.data().role : 'admin';
        const isOperador = userRole === 'operador';
        const stats = await getDashboardStats();
        const pendingProposals = await getProposals({ status: 'pending' });
        const cobrancasSugeridas = await getCobrancasSugeridas();
        const dashboardSettings = await getSettings();

        appDiv.innerHTML = `
            <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
                <div><h1>${icon('bank')} CerraLoan</h1><p>Olá, ${userName}! </p></div>
                <button onclick="handleLogout()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;" title="Sair">${icon('log-out')}</button>
            </div>
           
            ${!isOperador ? `
            <div class="balance-card">
                <div class="label">${icon('wallet')} Saldo Devedor Total Ativo</div>
                <div class="amount">${formatarMoeda(stats.totalActiveBalance || 0)}</div>
            </div>
            ` : ''}

            <div class="stats-grid" style="margin-top:16px;">
                <div class="stat-card">
                    <div class="stat-value">${stats.activeLoans || 0}</div>
                    <div class="stat-label">${icon('clipboard')} Empréstimos Ativos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.totalClients || 0}</div>
                    <div class="stat-label">${icon('users')} Clientes</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.paidLoans || 0}</div>
                    <div class="stat-label">${icon('check-circle')} Quitados</div>
                </div>
                ${!isOperador ? `
                <div class="stat-card">
                    <div class="stat-value">${formatarMoeda(stats.totalLent || 0)}</div>
                    <div class="stat-label">${icon('banknote')} Total Emprestado</div>
                </div>
                ` : ''}
            </div>

            ${cobrancasSugeridas.length > 0 ? `
            <div class="card" style="margin:16px 0;padding:16px;border-left:4px solid var(--warning);">
                <h4 style="margin-bottom:8px;">${icon('refresh-cw')} Cobranças Sugeridas Hoje (${cobrancasSugeridas.length})</h4>
                <p style="font-size:0.8rem;color:var(--text-light);margin-bottom:12px;">
                    Empréstimos sem pagamento há mais de ${dashboardSettings.reminderRuleDays || 5} dias.
                </p>
                ${cobrancasSugeridas.slice(0, 5).map(l => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.06);cursor:pointer;" onclick="location.hash='#loan-detail?id=${l.id}'">
                        <span>${icon('user')} ${l.clientName}</span>
                        <small style="color:var(--danger);">${l.diasSemPagamento} dias</small>
                    </div>
                `).join('')}
            </div>
            ` : ''}

            <!-- GRÁFICOS (Chart.js) -->
            <div style="margin:24px 0;">
                <h3>${icon('bar-chart')} Visão Geral</h3>
                <div class="card" style="margin:12px 0;padding:16px;">
                    <h4 style="text-align:center;">Empréstimos por Status</h4>
                    <div style="max-width:250px;margin:0 auto;">
                        <canvas id="chart-status"></canvas>
                    </div>
                </div>
                ${(() => {
                    const topDevedores = (stats.recentLoans || [])
                        .filter(l => l.status === 'active')
                        .sort((a, b) => (b.currentBalance || 0) - (a.currentBalance || 0))
                        .slice(0, 5);
                    if (topDevedores.length > 0) {
                        return `
                            <div class="card" style="margin:12px 0;padding:16px;">
                                <h4 style="text-align:center;">Top Devedores</h4>
                                <canvas id="chart-devedores"></canvas>
                            </div>
                        `;
                    }
                    return '';
                })()}
            </div>
           
            <div style="margin-top:24px;">
                <h3>Empréstimos Recentes</h3>
               
                ${(() => {
                    const alertLoans = (stats.recentLoans || []).filter(l => {
                        if (l.status !== 'active') return false;
                        const startDate = l.startDate?.toDate ? l.startDate.toDate() : new Date(l.startDate);
                        return diasEntre(startDate, new Date()) > 30;
                    });
                   
                    if (alertLoans.length > 0) {
                        return `
                            <div class="card" style="margin:16px 0;padding:16px;background:linear-gradient(135deg,#f8d7da,#f5c6cb);border:none;">
                                <h4 style="color:#721c24;margin:0 0 8px;">${icon('alert-triangle')} Atenção! ${alertLoans.length} empréstimo(s) com mais de 30 dias</h4>
                                ${alertLoans.map(l => `
                                    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.1);font-size:0.85rem;">
                                        <span style="color:#721c24;">${l.clientName}</span>
                                        <strong style="color:#721c24;">${formatarMoeda(l.currentBalance || l.saldoHoje || 0)}</strong>
                                    </div>
                                `).join('')}
                            </div>
                        `;
                    }
                    return '';
                })()}
               
                <div id="recent-loans">
                    ${stats.recentLoans && stats.recentLoans.length > 0 
                        ? stats.recentLoans.map(loan => `
                            <div class="card loan-card" style="margin:8px 0;padding:16px;cursor:pointer;" 
                                 onclick="location.hash='#loan-detail?id=${loan.id}'">
                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                    <div>
                                        <strong>${icon('user')} ${loan.clientName}</strong><br>
                                        <small>${formatarMoeda(loan.principalAmount)} ${icon('arrow-right')} ${formatarMoeda(loan.currentBalance)}</small><br>
                                        <small>${(loan.dailyInterestRate * 100).toFixed(1)}%/dia</small>
                                    </div>
                                    <div>${window.getLoanStatusDisplay(loan)}</div>
                                </div>
                            </div>
                        `).join('')
                        : (window.emptyState ? window.emptyState('clipboard', 'Nenhum empréstimo', 'Cadastre um cliente', '+ Novo Cliente', '#new-client') : '')
                    }
                </div>
            </div>
           
            <div style="margin:16px 0;">
                <button class="btn btn-accent" style="width:100%;" onclick="location.hash='#new-loan'">${icon('plus')} Novo Empréstimo</button>
            </div>
            <div style="margin:0 0 100px;">
                <button class="btn btn-outline btn-block" onclick="location.hash='#proposals'">
                    ${icon('receipt')} Propostas de Vendedores${pendingProposals.length > 0 ? ` (${pendingProposals.length} pendente${pendingProposals.length > 1 ? 's' : ''})` : ''}
                </button>
            </div>
        `;

        // Inicializar Gráficos
        setTimeout(() => {
            const ctxStatus = document.getElementById('chart-status');
            if (ctxStatus && window.Chart) {
                window.Chart.getChart(ctxStatus)?.destroy();
                new Chart(ctxStatus, {
                    type: 'doughnut',
                    data: {
                        labels: ['Ativos', 'Quitados'],
                        datasets: [{
                            data: [stats.activeLoans || 0, stats.paidLoans || 0],
                            backgroundColor: ['#e94560', '#00b894'],
                            borderWidth: 0
                        }]
                    },
                    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
                });
            }
           
            const topDevedores = (stats.recentLoans || []).filter(l => l.status === 'active').sort((a,b)=>(b.currentBalance||0)-(a.currentBalance||0)).slice(0,5);
            const ctxDevedores = document.getElementById('chart-devedores');
            if (ctxDevedores && topDevedores.length > 0 && window.Chart) {
                window.Chart.getChart(ctxDevedores)?.destroy();
                new Chart(ctxDevedores, {
                    type: 'bar',
                    data: {
                        labels: topDevedores.map(l => l.clientName?.split(' ')[0] || '?'),
                        datasets: [{ label: 'Saldo Devedor', data: topDevedores.map(l => l.currentBalance || 0), backgroundColor: '#e94560', borderRadius: 8 }]
                    },
                    options: {
                        responsive: true, plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true, ticks: { callback: v => 'R$' + v.toLocaleString('pt-BR') } } }
                    }
                });
            }
        }, 300);

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        appDiv.innerHTML = `<div class="empty-state"><h3>Erro ao carregar dados</h3><p>${error.message}</p>
        <button class="btn btn-accent" onclick="loadDashboard()">${icon('refresh-cw')} Tentar Novamente</button></div>`;
    }
};

window.loadClients = async function() {
    const appDiv = document.getElementById('app');
    appDiv.innerHTML = `<div class="page-header"><h2>${icon('users')} Clientes</h2></div><div class="loading-container"><div class="spinner"></div></div>`;
   
    try {
        const clients = await getClients();
        const allLoans = await getLoans();
        const loansByClient = {};
        for (const l of allLoans) {
            (loansByClient[l.clientId] = loansByClient[l.clientId] || []).push(l);
        }

        appDiv.innerHTML = `
            <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
                <div><h1>${icon('users')} Clientes</h1></div>
            </div>
            <div class="card" style="display:flex;align-items:center;gap:8px;color:var(--text-light);">
                ${icon('search')}
                <input type="text" id="search-client" placeholder="Buscar nome ou CPF..." style="width:100%; height:40px; padding:8px; border:none; background:transparent;">
            </div>
            <div id="clients-list"></div>
            <div style="margin:16px 0 100px;">
                <button class="btn btn-primary btn-block" onclick="location.hash='#new-client'">${icon('plus')} Novo Cliente</button>
            </div>
        `;

        const renderList = (list) => {
            const listEl = document.getElementById('clients-list');
            if (list.length === 0) {
                listEl.innerHTML = window.emptyState ? window.emptyState('users', 'Nenhum cliente cadastrado', 'Cadastre seu primeiro cliente', '+ Novo Cliente', '#new-client') : '<p>Nenhum cliente</p>';
                return;
            }
            listEl.innerHTML = list.map(c => {
                const score = calcularScoreCliente(loansByClient[c.id] || []);
                return `
                <div class="card" style="margin:8px 0;padding:16px;cursor:pointer;" onclick="location.hash='#client-detail?id=${c.id}'">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <strong>${icon('user')} ${c.name}</strong>
                        ${window.scoreBadge(score)}
                    </div>
                    <small>CPF: ${c.cpf || 'N/A'}</small><br>
                    <small>${icon('phone')} ${c.phone || 'N/A'}</small>
                </div>
            `;
            }).join('');
        };
        renderList(clients);
       
        document.getElementById('search-client')?.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = clients.filter(c => (c.name||'').toLowerCase().includes(q) || (c.cpf||'').replace(/\D/g, '').includes(q.replace(/\D/g, '')));
            renderList(filtered);
        });
    } catch (error) {
         appDiv.innerHTML = `<div class="empty-state">Erro: ${error.message}</div>`;
    }
};

window.loadNewClientForm = async function() {
    const appDiv = document.getElementById('app');
    appDiv.innerHTML = `
        <div class="page-header" style="display:flex; justify-content:space-between; align-items:center;">
             <button onclick="history.back()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;">${icon('arrow-left')}</button>
             <h2>${icon('plus')} Novo Cliente</h2>
        </div>
        <div class="card">
            <form id="new-client-form">
                <div class="input-group"><label>Nome Completo</label><input type="text" id="client-name" required></div>
                <div class="input-group"><label>CPF</label><input type="text" id="client-cpf" placeholder="000.000.000-00" required></div>
                <div class="input-group"><label>Telefone</label><input type="text" id="client-phone" placeholder="(00) 00000-0000" required></div>
                <div class="input-group"><label>Email</label><input type="email" id="client-email" required></div>
                <div class="input-group"><label>Senha Inicial</label><input type="password" id="client-password" minlength="6" required></div>
                <button type="submit" class="btn btn-primary btn-block">Cadastrar</button>
            </form>
        </div>
    `;
    setTimeout(() => {
        document.getElementById('new-client-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                if(window.showLoading) window.showLoading();
                const email = document.getElementById('client-email').value.trim();
                const pass = document.getElementById('client-password').value;
                const secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");
                const res = await secondaryApp.auth().createUserWithEmailAndPassword(email, pass);
                await db.collection('users').doc(res.user.uid).set({
                    name: document.getElementById('client-name').value.trim(),
                    cpf: document.getElementById('client-cpf').value.trim(),
                    phone: document.getElementById('client-phone').value.trim(),
                    email: email, role: 'client', createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                await secondaryApp.auth().signOut();
                await secondaryApp.delete();
                if(window.hideLoading) window.hideLoading();
                alert('Cliente cadastrado com sucesso!');
                location.hash = '#clients';
            } catch(err) {
                if(window.hideLoading) window.hideLoading();
                alert('Erro: ' + err.message);
            }
        });
    }, 50);
};

window.loadClientDetail = async function() {
    const appDiv = document.getElementById('app');
    const params = new URLSearchParams(location.hash.split('?')[1]);
    const id = params.get('id');
    appDiv.innerHTML = `<div class="loading-container"><div class="spinner"></div></div>`;
   
    try {
        const client = await getClient(id);
        const loans = await getLoans({ clientId: id });
        appDiv.innerHTML = `
            <div class="page-header" style="display:flex; justify-content:space-between; align-items:center;">
                 <button onclick="history.back()" style="background:none;border:none;font-size:1.1rem;cursor:pointer;white-space:nowrap;">${icon('arrow-left')} Voltar</button>
                 <h2>${icon('user')} Detalhes do Cliente</h2>
            </div>
            <div class="card">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <h3>${client.name}</h3>
                    ${window.scoreBadge(calcularScoreCliente(loans))}
                </div>
                <p>CPF: ${client.cpf || '-'}</p>
                <p>Email: ${client.email || '-'}</p>
                <p>Telefone: ${client.phone || '-'}</p>
            </div>
            <h3>${icon('home')} Empréstimos do Cliente</h3>
            <div id="client-loans-list">
                 ${loans.length > 0 ? loans.map(l => `
                      <div class="card" style="margin:8px 0;padding:16px;cursor:pointer" onclick="location.hash='#loan-detail?id=${l.id}'">
                           <strong>R$ ${l.principalAmount} ${icon('arrow-right')} R$ ${l.currentBalance}</strong>
                           <span style="float:right;">${window.getLoanStatusDisplay(l)}</span>
                      </div>
                 `).join('') : '<p>Nenhum empréstimo</p>'}
            </div>
            <div style="margin:16px 0 100px;">
                <button class="btn btn-accent btn-block" onclick="location.hash='#new-loan?clientId=${client.id}'">${icon('plus')} Novo Empréstimo</button>
            </div>
        `;
    } catch(err) {
        appDiv.innerHTML = `<div class="empty-state">Erro: ${err.message}</div>`;
    }
};

window.loadLoans = async function() {
    const appDiv = document.getElementById('app');
    appDiv.innerHTML = `<div class="loading-container"><div class="spinner"></div></div>`;
    try {
        const allLoans = await getLoans();
        appDiv.innerHTML = `
            <div class="page-header"><h1>${icon('wallet')} Empréstimos</h1><p class="subtitle">Histórico</p></div>
            <div id="loans-list"></div>
            <div style="margin:16px 0 100px;"><button class="btn btn-primary btn-block" onclick="location.hash='#new-loan'">${icon('plus')} Novo Empréstimo</button></div>
        `;
        const listEl = document.getElementById('loans-list');
        if(allLoans.length === 0) {
            listEl.innerHTML = window.emptyState ? window.emptyState('wallet', 'Nenhum empréstimo', 'Comece a operar', '+ Novo', '#new-loan') : '<p>Vazio</p>';
        } else {
            listEl.innerHTML = allLoans.map(loan => `
                 <div class="card loan-card" style="margin:8px 0;padding:16px;cursor:pointer;" onclick="location.hash='#loan-detail?id=${loan.id}'">
                     <div style="display:flex;justify-content:space-between;align-items:center;">
                          <strong>${icon('user')} ${loan.clientName}</strong>
                          <div>${window.getLoanStatusDisplay(loan)}</div>
                     </div>
                     <small>Original: R$ ${loan.principalAmount} | Atual: R$ ${loan.currentBalance}</small>
                 </div>
            `).join('');
        }
    } catch (e) {
        appDiv.innerHTML = `<div class="empty-state">Erro: ${e.message}</div>`;
    }
};

window.loadNewLoanForm = async function() {
    const appDiv = document.getElementById('app');
    const params = new URLSearchParams(location.hash.split('?')[1]);
    const cid = params.get('clientId');
    appDiv.innerHTML = `<div class="loading-container"><div class="spinner"></div></div>`;
    try {
        const clients = await getClients();
        appDiv.innerHTML = `
            <div class="page-header" style="display:flex; align-items:center;">
                 <button onclick="history.back()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;margin-right:12px;">${icon('arrow-left')}</button>
                 <h2>${icon('plus')} Novo Empréstimo</h2>
            </div>
            <div class="card">
                <form id="new-loan-form">
                    <div class="input-group">
                        <label>Cliente</label>
                        <select id="loan-client" required>
                             <option value="">Selecione um cliente...</option>
                             ${clients.map(c => `<option value="${c.id}" ${c.id===cid?'selected':''}>${c.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="input-group"><label>Valor Principal (R$)</label><input type="number" id="loan-amount" step="0.01" required></div>
                    <div class="input-group"><label>Taxa de Juros ao Dia (%)</label><input type="number" id="loan-rate" step="0.01" value="1.0" required></div>
                    <div class="input-group"><label>Data de Início</label><input type="date" id="loan-date" required></div>
                    <button type="submit" class="btn btn-primary btn-block">Registrar</button>
                </form>
            </div>
        `;
        document.getElementById('loan-date').valueAsDate = new Date();
        document.getElementById('new-loan-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                if(window.showLoading) window.showLoading();
                const sel = document.getElementById('loan-client');
                const clientName = sel.options[sel.selectedIndex].text;
                const data = {
                    clientId: sel.value, clientName: clientName,
                    principalAmount: document.getElementById('loan-amount').value,
                    dailyInterestRate: document.getElementById('loan-rate').value / 100,
                    startDate: new Date(document.getElementById('loan-date').value + 'T12:00:00')
                };
                await addLoan(data);
                if(window.hideLoading) window.hideLoading();
                alert('Sucesso!');
                location.hash = '#loans';
            } catch(err) {
                if(window.hideLoading) window.hideLoading();
                alert('Erro: '+err.message);
            }
        });
    } catch(e) {
        appDiv.innerHTML = `<div class="empty-state">Erro: ${e.message}</div>`;
    }
};

window.loadLoanDetail = async function() {
    const appDiv = document.getElementById('app');
    const params = new URLSearchParams(location.hash.split('?')[1]);
    const id = params.get('id');
    appDiv.innerHTML = `<div class="loading-container"><div class="spinner"></div></div>`;
    try {
        const {loan, payments} = await getLoan(id);
        appDiv.innerHTML = `
            <div class="page-header" style="display:flex; align-items:center;">
                 <button onclick="history.back()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;margin-right:12px;">${icon('arrow-left')}</button>
                 <h2>Detalhes do Empréstimo</h2>
            </div>
            <div class="card">
                 <h3>Cliente: ${loan.clientName}</h3>
                 <p>Original: R$ ${loan.principalAmount}</p>
                 <p>Saldo Devedor Hoje: <strong>R$ ${loan.currentBalance}</strong></p>
                 <p>Status: ${window.getLoanStatusDisplay(loan)}</p>
                 ${loan.status === 'active' ? `<button class="btn btn-outline btn-block mt-2" id="btn-toggle-renegociar">${icon('refresh-cw')} Renegociar Dívida</button>` : ''}
                 ${loan.status === 'renegotiated' ? `<p style="font-size:0.85rem;color:var(--text-light);margin-top:8px;"><a href="#loan-detail?id=${loan.renegotiatedTo}">Ver novo contrato ${icon('arrow-right')}</a></p>` : ''}
            </div>

            <div class="card" id="renegociar-form-card" style="display:none;">
                <h4 style="margin-bottom:8px;">${icon('refresh-cw')} Renegociar Dívida</h4>
                <p style="font-size:0.8rem;color:var(--text-light);margin-bottom:12px;">
                    Fecha este empréstimo e cria um novo contrato vinculado, a partir do
                    saldo devedor de hoje (R$ ${loan.currentBalance}).
                </p>
                <div class="input-group"><label>Novo Valor (R$)</label><input type="number" id="reneg-amount" step="0.01" value="${loan.currentBalance}"></div>
                <div class="input-group"><label>Nova Taxa Diária (%)</label><input type="number" id="reneg-rate" step="0.01" value="${(loan.dailyInterestRate * 100).toFixed(2)}"></div>
                <div class="input-group"><label>Motivo</label><input type="text" id="reneg-motivo" placeholder="Ex: cliente pediu mais prazo"></div>
                <button class="btn btn-primary btn-block" id="btn-confirmar-renegociar">Confirmar Renegociação</button>
            </div>

            <!-- COBRANÇA WHATSAPP -->
            <div id="whatsapp-section"></div>

            <!-- COBRANÇA PIX (ilustrativo) -->
            <div class="card">
                <h4 style="margin-bottom:8px;">Cobrança via Pix</h4>
                <button class="btn btn-outline btn-block" id="btn-gerar-pix">Gerar Cobrança Pix</button>
                <div id="pix-section" style="margin-top:12px;"></div>
            </div>

            <!-- COMPROVANTES ENVIADOS PELO CLIENTE -->
            <div class="card">
                <h4 style="margin-bottom:8px;">${icon('file-text')} Comprovantes do Cliente</h4>
                <div id="proofs-list"><p style="color:var(--text-light);font-size:0.85rem;">Carregando...</p></div>
            </div>

            <!-- ÚLTIMAS SIMULAÇÕES (sinal de intenção de pagamento) -->
            <div class="card">
                <h4 style="margin-bottom:8px;">${icon('calendar')} Últimas Simulações do Cliente</h4>
                <div id="simulations-list"><p style="color:var(--text-light);font-size:0.85rem;">Carregando...</p></div>
            </div>

            <div class="card">
                 <h3>Adicionar Pagamento</h3>
                 <div class="input-group"><input type="number" id="pay-amount" placeholder="Valor R$" step="0.01"></div>
                 <div class="input-group"><input type="date" id="pay-date"></div>
                 <button class="btn btn-primary btn-block" id="btn-pay">Registrar Pagamento</button>
            </div>
            <h3>Histórico de Pagamentos</h3>
            <div id="payments-history" style="margin-bottom:20px;">
                 ${payments.length>0 ? payments.map((p, index) => `
                      <div class="card" style="margin:8px 0;padding:12px; display:flex; justify-content:space-between; align-items:center;">
                           <div>
                               <strong>R$ ${p.amount}</strong><br>
                               <small>${formatarData(p.date?.toDate ? p.date.toDate() : new Date(p.date))}</small>
                           </div>
                           <button class="btn" style="padding:6px 12px;font-size:0.75rem;background:var(--secondary);color:white;"
                                   data-action="recibo" data-payment-index="${index}">
                               ${icon('file-text')} Recibo
                           </button>
                      </div>
                 `).join('') : '<p>Nenhum pagamento</p>'}
            </div>
           
            <!-- HISTÓRICO DE COBRANÇAS -->
            <div id="reminders-history" style="margin-bottom:100px;"></div>
        `;
       
        // Pós Renderização (Renderizar e atuar de forma assíncrona)
        setTimeout(async () => {
             // Setup Reminders & WhatsApp
             const clientDoc = await db.collection('users').doc(loan.clientId).get();
             const clientPhone = clientDoc.exists ? clientDoc.data().phone : '';
             const clientName = loan.clientName || 'Cliente';

             document.getElementById('btn-toggle-renegociar')?.addEventListener('click', () => {
                 const card = document.getElementById('renegociar-form-card');
                 if (card) card.style.display = card.style.display === 'none' ? 'block' : 'none';
             });

             document.getElementById('btn-confirmar-renegociar')?.addEventListener('click', async () => {
                 if (!confirm('Confirmar renegociação? O empréstimo atual será encerrado e um novo será criado.')) return;
                 try {
                     if (window.showLoading) showLoading();
                     const newLoanId = await renegotiateLoan(id, {
                         newPrincipal: document.getElementById('reneg-amount').value,
                         newDailyRate: parseFloat(document.getElementById('reneg-rate').value) / 100,
                         motivo: document.getElementById('reneg-motivo').value.trim()
                     });
                     if (window.hideLoading) hideLoading();
                     if (window.showToast) showToast('Dívida renegociada! Novo contrato criado.', 'success');
                     location.hash = `#loan-detail?id=${newLoanId}`;
                 } catch (err) {
                     if (window.hideLoading) hideLoading();
                     if (window.showToast) showToast('Erro: ' + err.message, 'error');
                 }
             });

             document.getElementById('btn-gerar-pix')?.addEventListener('click', async () => {
                 const settings = await getSettings();
                 window.abrirPix(loan.currentBalance, settings.companyName, 'pix-section');
             });

             // Comprovantes enviados pelo cliente
             const proofs = await getPaymentProofs(id);
             const proofsList = document.getElementById('proofs-list');
             if (proofsList) {
                 const pendingProofs = proofs.filter(p => p.status === 'pending');
                 proofsList.innerHTML = proofs.length === 0
                     ? '<p style="color:var(--text-light);font-size:0.85rem;">Nenhum comprovante enviado.</p>'
                     : proofs.map(p => `
                         <div class="card" style="margin:8px 0;padding:12px;background:var(--bg);">
                             <div style="display:flex;justify-content:space-between;align-items:center;">
                                 <strong>${formatarMoeda(p.amount)}</strong>
                                 ${p.status === 'pending' ? `<span class="list-item-badge badge-attention">${icon('clock')} Pendente</span>` :
                                   p.status === 'confirmed' ? `<span class="list-item-badge badge-success" style="background:rgba(0,184,148,0.15);color:var(--success);">${icon('check-circle')} Confirmado</span>` :
                                   `<span class="list-item-badge badge-danger" style="background:rgba(214,48,49,0.15);color:var(--danger);">${icon('x-circle')} Rejeitado</span>`}
                             </div>
                             ${p.fileDataUrl ? `<img src="${p.fileDataUrl}" style="max-width:100%;max-height:160px;border-radius:8px;margin-top:8px;">` : ''}
                             ${p.status === 'pending' ? `
                                 <div style="display:flex;gap:8px;margin-top:8px;">
                                     <button class="btn btn-success btn-block" data-confirm-proof="${p.id}">${icon('check-circle')} Confirmar</button>
                                     <button class="btn btn-outline btn-block" data-reject-proof="${p.id}">${icon('x-circle')} Rejeitar</button>
                                 </div>
                             ` : ''}
                         </div>
                     `).join('');

                 proofsList.querySelectorAll('[data-confirm-proof]').forEach(btn => {
                     btn.addEventListener('click', async () => {
                         try {
                             if (window.showLoading) showLoading();
                             await confirmPaymentProof(id, btn.getAttribute('data-confirm-proof'));
                             if (window.hideLoading) hideLoading();
                             if (window.showToast) showToast('Pagamento confirmado!', 'success');
                             window.loadLoanDetail();
                         } catch (err) {
                             if (window.hideLoading) hideLoading();
                             if (window.showToast) showToast('Erro: ' + err.message, 'error');
                         }
                     });
                 });
                 proofsList.querySelectorAll('[data-reject-proof]').forEach(btn => {
                     btn.addEventListener('click', async () => {
                         try {
                             await rejectPaymentProof(id, btn.getAttribute('data-reject-proof'), '');
                             if (window.showToast) showToast('Comprovante rejeitado.', 'success');
                             window.loadLoanDetail();
                         } catch (err) {
                             if (window.showToast) showToast('Erro: ' + err.message, 'error');
                         }
                     });
                 });
             }

             // Últimas simulações do cliente
             const simulations = await getSimulations(id);
             const simulationsList = document.getElementById('simulations-list');
             if (simulationsList) {
                 simulationsList.innerHTML = simulations.length === 0
                     ? '<p style="color:var(--text-light);font-size:0.85rem;">O cliente ainda não simulou nenhuma quitação.</p>'
                     : simulations.slice(0, 5).map(s => `
                         <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.06);font-size:0.85rem;">
                             <span>Quitar em ${formatarData(s.targetDate)}</span>
                             <strong>${formatarMoeda(s.saldoSimulado)}</strong>
                         </div>
                     `).join('');
             }

             const lastReminder = await getLastReminder(id);
             let lastReminderText = 'Nenhuma cobrança enviada ainda';
             if (lastReminder) {
                 const d = lastReminder.sentAt?.toDate ? lastReminder.sentAt.toDate() : new Date();
                 const diasAtras = diasEntre(d, new Date());
                 lastReminderText = `Última cobrança: ${diasAtras === 0 ? 'hoje' : diasAtras + ' dias atrás'} (${formatarData(d)})`;
             }
            
             const whatsMessage = encodeURIComponent(
                 `Olá, ${clientName}!\n\n` +
                 `Segue atualização do seu empréstimo no CerraLoan:\n\n` +
                 `*Saldo devedor hoje:* ${formatarMoeda(loan.currentBalance || 0)}\n` +
                 `Data: ${formatarData(new Date())}\n` +
                 `Taxa: ${((loan.dailyInterestRate || 0) * 100).toFixed(1)}% ao dia\n\n` +
                 `Quanto antes quitar, menos juros!\n\n` +
                 `Acesse seu painel: https://cerraloan.web.app`
             );
             const whatsLink = clientPhone 
                 ? `https://wa.me/55${clientPhone.replace(/\D/g, '')}?text=${whatsMessage}` 
                 : '';
                
             const wpDiv = document.getElementById('whatsapp-section');
             if(wpDiv) {
                 wpDiv.innerHTML = `
                    <div class="card" style="margin:16px 0;padding:16px;">
                        <h4>${icon('message-circle')} Cobrança</h4>
                        <p style="color:var(--text-light);font-size:0.8rem;margin:4px 0 12px;">${lastReminderText}</p>
                        ${clientPhone ? `
                            <a href="${whatsLink}" target="_blank" rel="noopener" id="btn-whatsapp-cobrar"
                               class="btn" style="display:block;width:100%;padding:14px;background:#25D366;color:white;text-align:center;text-decoration:none;border-radius:12px;font-size:1rem;box-sizing:border-box;">
                                ${icon('message-circle')} Cobrar via WhatsApp
                            </a>
                        ` : `<p style="color:var(--accent);font-size:0.85rem;">${icon('alert-triangle')} Cliente sem telefone cadastrado</p>`}
                    </div>
                 `;
                
                 document.getElementById('btn-whatsapp-cobrar')?.addEventListener('click', async () => {
                     try {
                         await addReminder(id, {
                             sentBy: auth.currentUser.uid,
                             method: 'whatsapp',
                             saldoAtMoment: loan.currentBalance,
                             message: decodeURIComponent(whatsMessage)
                         });
                         if(window.showToast) showToast('Cobrança registrada', 'success');
                     } catch(e) {
                         console.error('Erro ao registrar cobrança:', e);
                     }
                 });
             }
            
             // Histórico de Reminders
             const reminders = await getReminders(id);
             const rmDiv = document.getElementById('reminders-history');
             if(rmDiv) {
                 rmDiv.innerHTML = `
                    <div style="margin:16px 0;">
                        <h4>${icon('message-circle')} Histórico de Cobranças</h4>
                        ${reminders.length > 0 ? reminders.map(r => `
                            <div class="card" style="margin:6px 0;padding:12px;font-size:0.85rem;">
                                <div style="display:flex;justify-content:space-between;">
                                    <span>${icon('message-circle')} WhatsApp</span>
                                    <span>${r.sentAt?.toDate ? formatarData(r.sentAt.toDate()) : '-'}</span>
                                </div>
                                <small style="color:var(--text-light);">Saldo na hora: ${formatarMoeda(r.saldoAtMoment || 0)}</small>
                            </div>
                        `).join('') : '<p style="color:var(--text-light);font-size:0.85rem;">Nenhuma cobrança registrada</p>'}
                    </div>
                 `;
             }
            
             // Event Listeners PDF Recibos
             document.querySelectorAll('[data-action="recibo"]').forEach(btn => {
                 btn.addEventListener('click', () => {
                     const idx = parseInt(btn.dataset.paymentIndex);
                     const payment = payments[idx];
                     if(window.gerarReciboPagamento) {
                         gerarReciboPagamento(loan, payment, clientDoc.data());
                         if(window.showToast) showToast('Recibo gerado!', 'success');
                     }
                 });
             });
        }, 100);

        document.getElementById('pay-date').valueAsDate = new Date();
        document.getElementById('btn-pay').addEventListener('click', async () => {
             const amt = document.getElementById('pay-amount').value;
             const dt = document.getElementById('pay-date').value;
             if(!amt || !dt) return;
             if(confirm(`Confirmar pagamento de R$ ${amt}?`)) {
                  try {
                       if(window.showLoading) window.showLoading();
                       await addPayment(loan.id, { amount: amt, date: new Date(dt + 'T12:00:00') });
                       if(window.hideLoading) window.hideLoading();
                       loadLoanDetail();
                  } catch(e) {
                       if(window.hideLoading) window.hideLoading();
                       alert('Erro: ' + e.message);
                  }
             }
        });
    } catch(e) {
        appDiv.innerHTML = `<div class="empty-state">Erro: ${e.message}</div>`;
    }
};

window.loadSettings = async function() {
    const appDiv = document.getElementById('app');

    // Setup Dark Mode Checkbox state
    const currentTheme = localStorage.getItem('cerraloan-theme');
    const isDark = currentTheme === 'dark';
    const settings = await getSettings();

    appDiv.innerHTML = `
        <div class="page-header" style="display:flex; justify-content:space-between; align-items:center;">
             <h2>${icon('settings')} Configurações</h2>
        </div>

        <!-- RELATÓRIOS E EXPORTAÇÃO -->
        <div class="card">
            <h3>${icon('bar-chart')} Relatórios e Dados</h3>
            <p style="font-size:0.85rem;color:var(--text-light);margin-bottom:12px;">
                Exporte os dados do sistema para análise. Deixe as datas em branco para
                exportar tudo.
            </p>
            <div style="display:flex;gap:8px;margin-bottom:12px;">
                <div class="input-group" style="margin-bottom:0;flex:1;">
                    <label>De</label>
                    <input type="date" id="report-start-date">
                </div>
                <div class="input-group" style="margin-bottom:0;flex:1;">
                    <label>Até</label>
                    <input type="date" id="report-end-date">
                </div>
            </div>
            <button class="btn btn-outline btn-block mb-1" onclick="window.gerarRelatorioPDF(window.getReportFiltro())">
                ${icon('file-text')} Gerar Relatório Geral (PDF)
            </button>
            <button class="btn btn-outline btn-block" onclick="window.exportarExcel(window.getReportFiltro())">
                ${icon('bar-chart')} Exportar Tudo (Excel)
            </button>
        </div>

        <!-- REGRAS AUTOMÁTICAS -->
        <div class="card">
            <h3>${icon('refresh-cw')} Regras Automáticas</h3>
            <p style="font-size:0.85rem;color:var(--text-light);margin-bottom:12px;">
                Usadas para sugerir cobranças no dashboard e calcular a comissão dos
                vendedores quando uma proposta é aprovada.
            </p>
            <form id="rules-form">
                <div class="input-group">
                    <label>Sugerir cobrança após quantos dias sem pagamento</label>
                    <input type="number" id="reminder-rule-days" min="1" value="${settings.reminderRuleDays || 5}">
                </div>
                <div class="input-group">
                    <label>Comissão do vendedor (%) sobre o valor aprovado</label>
                    <input type="number" id="commission-rate" min="0" step="0.1" value="${((settings.commissionRate || 0.03) * 100).toFixed(1)}">
                </div>
                <button type="submit" class="btn btn-primary btn-block">Salvar Regras</button>
            </form>
        </div>

        <!-- AUDITORIA -->
        <div class="card">
            <h3>${icon('shield')} Auditoria (Logs)</h3>
            <p style="font-size:0.85rem;color:var(--text-light);margin-bottom:12px;">
                Histórico de ações críticas do sistema.
            </p>
            <div id="logs-container" style="max-height:200px;overflow-y:auto;font-size:0.8rem;">
                <p>Carregando logs...</p>
            </div>
        </div>

        <!-- PREFERÊNCIAS -->
        <div class="card">
             <h3>Preferências do Aplicativo</h3>

             <div style="display:flex; justify-content:space-between; align-items:center; margin: 16px 0;">
                <span>${icon('moon')} Modo Escuro</span>
                <label class="switch" style="position:relative; display:inline-block; width:40px; height:24px;">
                  <input type="checkbox" id="theme-toggle" ${isDark ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                  <span class="slider" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:#ccc; transition:.4s; border-radius:34px;"></span>
                  <style>
                    #theme-toggle:checked + .slider { background-color: var(--accent); }
                    .slider:before { position:absolute; content:""; height:16px; width:16px; left:4px; bottom:4px; background-color:white; transition:.4s; border-radius:50%; }
                    #theme-toggle:checked + .slider:before { transform: translateX(16px); }
                  </style>
                </label>
             </div>

             <button class="btn btn-danger btn-block mt-3" onclick="handleLogout()">Sair da Conta</button>
        </div>
        <div style="margin-bottom:100px;"></div>
    `;

    // Lógica Dark Mode
    document.getElementById('theme-toggle').addEventListener('change', (e) => {
        if (e.target.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('cerraloan-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('cerraloan-theme', 'light');
        }
    });

    window.getReportFiltro = function() {
        const start = document.getElementById('report-start-date')?.value || '';
        const end = document.getElementById('report-end-date')?.value || '';
        return { startDate: start || null, endDate: end || null };
    };

    document.getElementById('rules-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            if (window.showLoading) showLoading();
            await saveSettings({
                reminderRuleDays: parseInt(document.getElementById('reminder-rule-days').value) || 5,
                commissionRate: (parseFloat(document.getElementById('commission-rate').value) || 0) / 100
            });
            if (window.hideLoading) hideLoading();
            if (window.showToast) showToast('Regras salvas!', 'success');
        } catch (err) {
            if (window.hideLoading) hideLoading();
            if (window.showToast) showToast('Erro ao salvar: ' + err.message, 'error');
        }
    });

    // Carregar Logs
    try {
        const logsSnap = await db.collection('logs').orderBy('timestamp', 'desc').limit(20).get();
        const logsContainer = document.getElementById('logs-container');
        if (logsSnap.empty) {
            logsContainer.innerHTML = '<p>Nenhum registro de auditoria.</p>';
        } else {
            logsContainer.innerHTML = logsSnap.docs.map(doc => {
                const log = doc.data();
                const d = log.timestamp?.toDate ? formatarData(log.timestamp.toDate()) : '';
                return `
                    <div style="padding:6px 0; border-bottom:1px solid rgba(0,0,0,0.05);">
                        <strong style="color:var(--primary);">${log.userName}</strong> 
                        <span style="color:var(--text-light);">${d}</span><br>
                        ${log.description}
                    </div>
                `;
            }).join('');
        }
    } catch(e) {
        console.error('Erro logs:', e);
        document.getElementById('logs-container').innerHTML = 'Erro ao carregar logs.';
    }
};

// ===== CLIENT VIEWS =====

window.loadMyLoans = async function() {
    const appDiv = document.getElementById('app');
   
    // Skeleton
    appDiv.innerHTML = `
        <div class="page-header">
            <h1>${icon('bank')} CerraLoan</h1>
            <p>Carregando...</p>
        </div>
        <div class="skeleton skeleton-card" style="height:120px;margin:16px 0;"></div>
        <div class="skeleton skeleton-card" style="height:80px;margin:12px 0;"></div>
        <div class="skeleton skeleton-card" style="height:80px;margin:12px 0;"></div>
    `;
   
    try {
        const user = auth.currentUser;
        if (!user) { location.hash = '#login'; return; }
       
        // Buscar dados do cliente
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userName = userDoc.exists ? userDoc.data().name : 'Cliente';
       
        // Buscar empréstimos deste cliente
        const loansSnap = await db.collection('loans')
            .where('clientId', '==', user.uid)
            .get();
       
        let loans = [];
        let totalDevedorHoje = 0;
        let activeCount = 0;
        let paidCount = 0;
        let totalPago = 0;
       
        for (const doc of loansSnap.docs) {
            const loan = { id: doc.id, ...doc.data() };
           
            // Buscar pagamentos
            const paymentsSnap = await db.collection('loans')
                .doc(doc.id).collection('payments').get();
            const payments = paymentsSnap.docs.map(p => ({
                amount: p.data().amount,
                date: p.data().date?.toDate ? p.data().date.toDate() : new Date(p.data().date)
            }));
           
            // Calcular total pago neste empréstimo
            const totalPagoEmprestimo = payments.reduce((sum, p) => sum + p.amount, 0);
            totalPago += totalPagoEmprestimo;
           
            const startDate = loan.startDate?.toDate 
                ? loan.startDate.toDate() 
                : new Date(loan.startDate);
           
            if (loan.status === 'active') {
                const resultado = calcularSaldo(
                    loan.principalAmount,
                    loan.dailyInterestRate,
                    startDate,
                    payments,
                    new Date()
                );
                loan.saldoHoje = typeof resultado === 'object' ? resultado.saldoDevedor : resultado;
                loan.diasCorridos = diasEntre(startDate, new Date());
                totalDevedorHoje += loan.saldoHoje;
                activeCount++;
            } else {
                loan.saldoHoje = 0;
                paidCount++;
            }
           
            loan.startDateObj = startDate;
            loan.totalPago = totalPagoEmprestimo;
            loans.push(loan);
        }
       
        if (typeof checkVencimentoNotification === 'function') {
            checkVencimentoNotification(loans).catch(() => {});
        }

        // Ordenar: ativos primeiro, depois por data desc
        loans.sort((a, b) => {
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (a.status !== 'active' && b.status === 'active') return 1;
            return (b.startDateObj || 0) - (a.startDateObj || 0);
        });
       
        appDiv.innerHTML = `
            <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <h1>${icon('bank')} CerraLoan</h1>
                    <p>Olá, ${userName}! </p>
                </div>
                <button onclick="handleLogout()" 
                        style="background:none;border:none;font-size:1.5rem;cursor:pointer;"
                        title="Sair">${icon('log-out')}</button>
            </div>
           
            <!-- RESUMO DO CLIENTE -->
            <div class="balance-card">
                <div class="label">${icon('wallet')} Meu Saldo Devedor Total</div>
                <div class="amount">${formatarMoeda(totalDevedorHoje)}</div>
                <div class="label" style="margin-top:8px;">
                    ${activeCount > 0
                        ? 'Este é o valor para quitar TUDO hoje'
                        : 'Você está em dia!'}
                </div>
            </div>
           
            <!-- STATS DO CLIENTE -->
            <div class="stats-grid" style="margin-top:16px;">
                <div class="stat-card">
                    <div class="stat-value">${loans.length}</div>
                    <div class="stat-label">${icon('clipboard')} Total Empréstimos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${activeCount}</div>
                    <div class="stat-label"><span class="status-dot" style="color:var(--success);"></span> Ativos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${paidCount}</div>
                    <div class="stat-label">${icon('check-circle')} Quitados</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatarMoeda(totalPago)}</div>
                    <div class="stat-label">${icon('banknote')} Total Pago</div>
                </div>
            </div>
           
            <!-- EMPRÉSTIMOS ATIVOS -->
            ${activeCount > 0 ? `
                <div style="margin-top:24px;">
                    <h3><span class="status-dot" style="color:var(--success);"></span> Empréstimos Ativos</h3>
                    ${loans.filter(l => l.status === 'active').map(loan => `
                        <div class="card" style="margin:10px 0;padding:16px;cursor:pointer;border-left:4px solid var(--success);"
                             data-loan-id="${loan.id}" data-type="my-loan-card">
                           
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                                <div>
                                    <small style="color:var(--text-light);">Emprestei</small><br>
                                    <strong>${formatarMoeda(loan.principalAmount)}</strong>
                                </div>
                                <div style="text-align:right;">
                                    <small style="color:var(--text-light);">Devo HOJE</small><br>
                                    <strong style="color:var(--accent);font-size:1.2rem;">
                                        ${formatarMoeda(loan.saldoHoje)}
                                    </strong>
                                </div>
                            </div>
                           
                            <div style="margin-top:12px;display:flex;justify-content:space-between;font-size:0.8rem;color:var(--text-light);">
                                <span>${icon('calendar')} ${formatarData(loan.startDateObj)}</span>
                                <span>${icon('clock')} ${loan.diasCorridos} dias</span>
                                <span>${icon('trending-up')} ${(loan.dailyInterestRate * 100).toFixed(1)}%/dia</span>
                            </div>
                           
                            <div style="margin-top:12px;display:flex;gap:8px;">
                                <button class="btn btn-accent" style="flex:1;padding:10px;font-size:0.85rem;"
                                        data-action="view-loan" data-id="${loan.id}">
                                    ${icon('bar-chart')} Ver Detalhes
                                </button>
                                <button class="btn" style="flex:1;padding:10px;font-size:0.85rem;background:var(--success);color:white;"
                                        data-action="simulate-loan" data-id="${loan.id}">
                                    ${icon('calculator')} Simular Quitação
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
           
            <!-- EMPRÉSTIMOS QUITADOS -->
            ${paidCount > 0 ? `
                <div style="margin-top:24px;">
                    <h3>${icon('check-circle')} Empréstimos Quitados</h3>
                    ${loans.filter(l => l.status === 'paid').map(loan => `
                        <div class="card" style="margin:10px 0;padding:16px;opacity:0.7;border-left:4px solid #ccc;"
                             data-loan-id="${loan.id}" data-type="my-loan-card">
                            <div style="display:flex;justify-content:space-between;">
                                <div>
                                    <strong>${formatarMoeda(loan.principalAmount)}</strong><br>
                                    <small style="color:var(--text-light);">
                                        ${formatarData(loan.startDateObj)}
                                    </small>
                                </div>
                                <div style="text-align:right;">
                                    ${statusBadge('paid')}<br>
                                    <small>Pago: ${formatarMoeda(loan.totalPago)}</small>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
           
            <!-- EMPTY STATE -->
            ${loans.length === 0 ? `
                <div class="empty-state" style="margin-top:40px;">
                    <div class="empty-emoji">${icon('smile')}</div>
                    <h3>Nenhum empréstimo</h3>
                    <p>Você não possui empréstimos no momento.</p>
                    <button class="btn btn-accent" style="margin-top:16px;"
                            data-action="request-loan">
                        ${icon('plus')} Solicitar Empréstimo
                    </button>
                </div>
            ` : ''}
           
            <!-- DICA -->
            ${activeCount > 0 ? `
                <div class="card" style="margin:24px 0;padding:16px;background:linear-gradient(135deg,#d4edda,#c3e6cb);border:none;">
                    <p style="margin:0;color:#155724;font-size:0.9rem;">
                        ${icon('lightbulb')} <strong>Dica:</strong> Quanto antes quitar, menos juros você paga! 
                        Cada dia que passa, o valor aumenta.
                    </p>
                </div>
            ` : ''}
           
            <div style="height:80px;"></div>
        `;
       
        // Event listeners
        document.querySelectorAll('[data-action="view-loan"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                location.hash = '#my-loan-detail?id=' + btn.dataset.id;
            });
        });
       
        document.querySelectorAll('[data-action="simulate-loan"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                location.hash = '#my-loan-detail?id=' + btn.dataset.id + '&focus=simulator';
            });
        });
       
        document.querySelectorAll('[data-type="my-loan-card"]').forEach(card => {
            card.addEventListener('click', () => {
                location.hash = '#my-loan-detail?id=' + card.dataset.loanId;
            });
        });
       
        document.querySelector('[data-action="request-loan"]')?.addEventListener('click', () => {
            location.hash = '#request-loan';
        });
       
    } catch (error) {
        console.error('Erro loadMyLoans:', error);
        appDiv.innerHTML = `
            <div class="page-header"><h1>${icon('bank')} CerraLoan</h1></div>
            <div class="empty-state">
                <div class="empty-emoji">${icon('alert-triangle')}</div>
                <h3>Erro ao carregar</h3>
                <p>${error.message}</p>
                <button class="btn btn-accent" onclick="loadMyLoans()">${icon('refresh-cw')} Tentar Novamente</button>
            </div>
        `;
    }
};

window.loadMyLoanDetail = async function() {
    const appDiv = document.getElementById('app');
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const loanId = params.get('id');
    const focusSimulator = params.get('focus') === 'simulator';
   
    if (!loanId) { location.hash = '#my-loans'; return; }
   
    // Skeleton
    appDiv.innerHTML = `
        <div class="page-header">
            <a href="#my-loans" style="text-decoration:none;color:var(--text);">${icon('arrow-left')} Voltar</a>
        </div>
        <div class="skeleton skeleton-card" style="height:200px;margin:16px 0;"></div>
    `;
   
    try {
        const user = auth.currentUser;
        if (!user) { location.hash = '#login'; return; }
       
        // Buscar empréstimo
        const loanDoc = await db.collection('loans').doc(loanId).get();
        if (!loanDoc.exists) { location.hash = '#my-loans'; return; }
       
        const loan = { id: loanDoc.id, ...loanDoc.data() };
       
        // Verificar se é do cliente logado
        if (loan.clientId !== user.uid) {
            if(window.showToast) showToast('Acesso negado', 'error');
            location.hash = '#my-loans';
            return;
        }
       
        // Buscar pagamentos
        const paymentsSnap = await db.collection('loans')
            .doc(loanId).collection('payments').get();
        const payments = paymentsSnap.docs.map(p => ({
            id: p.id,
            amount: p.data().amount,
            date: p.data().date?.toDate ? p.data().date.toDate() : new Date(p.data().date),
            type: p.data().type || 'partial'
        }));
        payments.sort((a, b) => b.date - a.date);
       
        const startDate = loan.startDate?.toDate 
            ? loan.startDate.toDate() 
            : new Date(loan.startDate);
       
        // Calcular saldo hoje
        const resultado = calcularSaldo(
            loan.principalAmount, loan.dailyInterestRate,
            startDate, payments, new Date()
        );
        const saldoHoje = typeof resultado === 'object' ? resultado.saldoDevedor : resultado;
        const jurosAcumulados = typeof resultado === 'object' ? resultado.jurosAcumulados : (saldoHoje - loan.principalAmount);
        const totalPago = payments.reduce((sum, p) => sum + p.amount, 0);
        const diasCorridos = diasEntre(startDate, new Date());
       
        // Gerar projeção 7 dias
        const projecao = gerarProjecao(
            loan.principalAmount, loan.dailyInterestRate,
            startDate, payments, 7
        );
       
        // Custo por dia
        const custoDiario = saldoHoje * loan.dailyInterestRate;
       
        const isQuitado = loan.status === 'paid';
       
        appDiv.innerHTML = `
            <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
                <a href="#my-loans" style="text-decoration:none;color:var(--text);font-size:1.1rem;">
                    ${icon('arrow-left')} Voltar
                </a>
                <button class="btn btn-outline" style="padding:6px 12px;font-size:0.85rem;" onclick="window.gerarExtratoCliente('${loanId}')">
                    ${icon('file-text')} Salvar Extrato
                </button>
            </div>
           
            ${isQuitado ? `
                <!-- EMPRÉSTIMO QUITADO -->
                <div class="card" style="margin:16px 0;padding:24px;text-align:center;background:linear-gradient(135deg,#d4edda,#c3e6cb);border:none;">
                    <div style="font-size:3rem;">${icon('check-circle')}</div>
                    <h2 style="color:#155724;margin:8px 0;">Parabéns!</h2>
                    <p style="color:#155724;">Empréstimo Quitado!</p>
                    <div style="margin-top:16px;font-size:0.9rem;color:#155724;">
                        <p>Você emprestou: <strong>${formatarMoeda(loan.principalAmount)}</strong></p>
                        <p>Pagou no total: <strong>${formatarMoeda(totalPago)}</strong></p>
                        <p>Juros pagos: <strong>${formatarMoeda(totalPago - loan.principalAmount)}</strong></p>
                    </div>
                </div>
            ` : `
                <!-- SALDO DEVEDOR HOJE - DESTAQUE PRINCIPAL -->
                <div class="balance-card" style="margin:16px 0;">
                    <div class="label">${icon('wallet')} QUANTO DEVO HOJE</div>
                    <div class="amount" style="font-size:2.2rem;">${formatarMoeda(saldoHoje)}</div>
                    <div class="label" style="margin-top:8px;">
                        Este é o valor para quitar AGORA
                    </div>
                    <div style="margin-top:12px;font-size:0.85rem;opacity:0.9;">
                        ${icon('alert-triangle')} Cada dia que passa custa mais 
                        <strong>${formatarMoeda(custoDiario)}</strong>
                    </div>
                </div>
            `}

            ${!isQuitado ? `
            <div class="card" style="margin:16px 0;padding:16px;">
                <h4 style="margin-bottom:8px;">Pagar com Pix</h4>
                <button class="btn btn-accent btn-block" id="btn-gerar-pix-cliente">Gerar Cobrança Pix</button>
                <div id="pix-section-cliente" style="margin-top:12px;"></div>
            </div>

            <div class="card" style="margin:16px 0;padding:16px;">
                <h4 style="margin-bottom:8px;">${icon('file-text')} Enviar Comprovante de Pagamento</h4>
                <p style="font-size:0.8rem;color:var(--text-light);margin-bottom:12px;">
                    Já pagou? Anexe o comprovante para o gestor confirmar o pagamento.
                </p>
                <div class="input-group"><label>Valor Pago (R$)</label><input type="number" id="proof-amount" step="0.01" min="0.01"></div>
                <div class="input-group">
                    <label>Comprovante (imagem)</label>
                    <input type="file" id="proof-file" accept="image/*" style="display:none;">
                    <button type="button" class="btn btn-outline btn-block" onclick="document.getElementById('proof-file').click()">Escolher Arquivo</button>
                    <small id="proof-file-label" style="color:var(--text-light);">Nenhum arquivo selecionado</small>
                </div>
                <button class="btn btn-primary btn-block" id="btn-send-proof">Enviar Comprovante</button>
            </div>
            ` : ''}

            <!-- DADOS DO EMPRÉSTIMO -->
            <div class="card" style="margin:16px 0;padding:16px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div>
                        <small style="color:var(--text-light);">Valor Emprestado</small><br>
                        <strong>${formatarMoeda(loan.principalAmount)}</strong>
                    </div>
                    <div>
                        <small style="color:var(--text-light);">Taxa Diária</small><br>
                        <strong>${(loan.dailyInterestRate * 100).toFixed(1)}% ao dia</strong>
                    </div>
                    <div>
                        <small style="color:var(--text-light);">Data do Empréstimo</small><br>
                        <strong>${formatarData(startDate)}</strong>
                    </div>
                    <div>
                        <small style="color:var(--text-light);">Dias Corridos</small><br>
                        <strong>${diasCorridos} dias</strong>
                    </div>
                    <div>
                        <small style="color:var(--text-light);">Total já Pago</small><br>
                        <strong style="color:var(--success);">${formatarMoeda(totalPago)}</strong>
                    </div>
                    <div>
                        <small style="color:var(--text-light);">Juros Acumulados</small><br>
                        <strong style="color:var(--accent);">${formatarMoeda(Math.abs(jurosAcumulados))}</strong>
                    </div>
                </div>
            </div>
           
            ${!isQuitado ? `
                <!-- SIMULADOR DE QUITAÇÃO -->
                <div class="card" style="margin:16px 0;padding:20px;" id="simulator-section">
                    <h3>${icon('calendar')} Simulador de Quitação</h3>
                    <p style="color:var(--text-light);font-size:0.85rem;margin-bottom:12px;">
                        Veja quanto vai custar se quitar em outra data
                    </p>
                   
                    <div style="display:flex;gap:8px;">
                        <input type="date" id="simulate-date" 
                               min="${new Date().toISOString().split('T')[0]}"
                               value="${new Date().toISOString().split('T')[0]}"
                               style="flex:1;" />
                        <button class="btn btn-accent" id="btn-simulate" 
                                style="padding:14px 20px;">
                            Calcular
                        </button>
                    </div>
                   
                    <div id="simulate-result" style="margin-top:16px;display:none;">
                        <div class="card" style="padding:16px;background:var(--bg);border:2px solid var(--accent);">
                            <div style="text-align:center;">
                                <small style="color:var(--text-light);">Valor em <span id="sim-date-label"></span>:</small>
                                <div style="font-size:1.8rem;font-weight:700;color:var(--accent);margin:8px 0;"
                                     id="sim-value"></div>
                                <div style="font-size:0.85rem;color:var(--text-light);" id="sim-diff"></div>
                            </div>
                        </div>
                    </div>
                </div>
               
                <!-- PROJEÇÃO 7 DIAS -->
                <div class="card" style="margin:16px 0;padding:20px;">
                    <h3>${icon('bar-chart')} Próximos 7 dias</h3>
                    <p style="color:var(--text-light);font-size:0.85rem;margin-bottom:12px;">
                        Veja como o valor aumenta a cada dia
                    </p>
                    <table class="projection-table" style="width:100%;">
                        ${projecao.map((item, i) => {
                            const data = item.data || item.date;
                            const saldo = item.saldo || item.balance;
                            const isToday = i === 0;
                            return `
                                <tr style="${isToday ? 'background:var(--primary);color:white;font-weight:600;' : ''}">
                                    <td style="padding:10px 14px;border-radius:${isToday ? '8px 0 0 8px' : '0'};">
                                        ${isToday ? 'Hoje' : formatarData(data instanceof Date ? data : new Date(data))}
                                    </td>
                                    <td style="padding:10px 14px;text-align:right;border-radius:${isToday ? '0 8px 8px 0' : '0'};">
                                        ${formatarMoeda(saldo)}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </table>
                </div>
            ` : ''}
           
            <!-- HISTÓRICO DE PAGAMENTOS -->
            <div style="margin:16px 0;">
                <h3>${icon('credit-card')} Meus Pagamentos</h3>
                ${payments.length > 0 
                    ? payments.map(p => `
                        <div class="card" style="margin:8px 0;padding:14px;display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <strong>${formatarData(p.date)}</strong><br>
                                <small style="color:var(--text-light);">
                                    ${p.type === 'full' ? `${icon('check-circle')} Quitação` : `${icon('credit-card')} Parcial`}
                                </small>
                            </div>
                            <div style="text-align:right;">
                                <strong style="color:var(--success);">
                                    ${formatarMoeda(p.amount)}
                                </strong>
                            </div>
                        </div>
                    `).join('')
                    : `
                        <div class="empty-state" style="padding:24px;">
                            <div class="empty-emoji">${icon('credit-card')}</div>
                            <p>Nenhum pagamento registrado ainda</p>
                        </div>
                    `
                }
            </div>
           
            <div style="height:80px;"></div>
        `;
       
        document.getElementById('btn-gerar-pix-cliente')?.addEventListener('click', async () => {
            const settings = await getSettings();
            window.abrirPix(saldoHoje, settings.companyName, 'pix-section-cliente');
        });

        // Event listener do simulador
        document.getElementById('btn-simulate')?.addEventListener('click', () => {
            const dateInput = document.getElementById('simulate-date');
            const targetDate = new Date(dateInput.value + 'T12:00:00');
           
            if (targetDate < new Date(new Date().toDateString())) {
                if(window.showToast) showToast('Selecione uma data futura', 'error');
                return;
            }
           
            const simResult = calcularSaldo(
                loan.principalAmount, loan.dailyInterestRate,
                startDate, payments, targetDate
            );
            const simSaldo = typeof simResult === 'object' ? simResult.saldoDevedor : simResult;
            const diferenca = simSaldo - saldoHoje;
           
            document.getElementById('simulate-result').style.display = 'block';
            document.getElementById('sim-date-label').textContent = formatarData(targetDate);
            document.getElementById('sim-value').textContent = formatarMoeda(simSaldo);
            document.getElementById('sim-diff').innerHTML = diferenca > 0
                ? `${icon('alert-triangle')} <strong>${formatarMoeda(diferenca)}</strong> a mais que hoje!`
                : diferenca < 0
                    ? `${icon('check-circle')} <strong>${formatarMoeda(Math.abs(diferenca))}</strong> a menos que hoje`
                    : `Mesmo valor de hoje`;

            addSimulation(loanId, targetDate, simSaldo).catch(err => console.error('Erro ao salvar simulação:', err));
        });

        document.getElementById('proof-file')?.addEventListener('change', () => {
            const file = document.getElementById('proof-file').files[0];
            const label = document.getElementById('proof-file-label');
            if (label) label.textContent = file ? file.name : 'Nenhum arquivo selecionado';
        });

        document.getElementById('btn-send-proof')?.addEventListener('click', async () => {
            const fileInput = document.getElementById('proof-file');
            const amountInput = document.getElementById('proof-amount');
            const file = fileInput?.files[0];
            const amount = parseFloat(amountInput?.value);

            if (!amount || amount <= 0) {
                if (window.showToast) showToast('Informe o valor pago', 'error');
                return;
            }
            if (!file) {
                if (window.showToast) showToast('Selecione o comprovante', 'error');
                return;
            }

            try {
                if (window.showLoading) showLoading();
                const fileDataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                await addPaymentProof(loanId, {
                    amount, date: new Date().toISOString(), type: 'partial', fileDataUrl
                });
                if (window.hideLoading) hideLoading();
                if (window.showToast) showToast('Comprovante enviado! Aguarde a confirmação do gestor.', 'success');
                amountInput.value = '';
                fileInput.value = '';
                document.getElementById('proof-file-label').textContent = 'Nenhum arquivo selecionado';
            } catch (err) {
                if (window.hideLoading) hideLoading();
                if (window.showToast) showToast('Erro ao enviar: ' + err.message, 'error');
            }
        });
       
        // Auto-scroll para simulador se veio do botão "Simular"
        if (focusSimulator) {
            setTimeout(() => {
                document.getElementById('simulator-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        }
       
    } catch (error) {
        console.error('Erro loadMyLoanDetail:', error);
        appDiv.innerHTML = `
            <div class="page-header">
                <a href="#my-loans" style="text-decoration:none;color:var(--text);">${icon('arrow-left')} Voltar</a>
            </div>
            <div class="empty-state">
                <div class="empty-emoji">${icon('alert-triangle')}</div>
                <h3>Erro ao carregar</h3>
                <p>${error.message}</p>
                <button class="btn btn-accent" onclick="location.hash='#my-loans'">${icon('arrow-left')} Voltar</button>
            </div>
        `;
    }
};

window.loadRequestLoan = async function() {
    const appDiv = document.getElementById('app');
    const user = auth.currentUser;
    if (!user) { location.hash = '#login'; return; }
   
    // Buscar dados da empresa
    let companyPhone = '';
    let companyName = 'CerraLoan';
    try {
        const settings = await typeof getSettings === 'function' ? getSettings() : {companyName: 'CerraLoan', companyPhone: ''};
        companyPhone = settings.companyPhone || '';
        companyName = settings.companyName || 'CerraLoan';
    } catch(e) {}
   
    // Buscar nome do cliente
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userName = userDoc.exists ? userDoc.data().name : 'Cliente';
   
    // Mensagem WhatsApp pré-formatada
    const whatsMsg = encodeURIComponent(
        `Olá! Sou ${userName}, cliente do ${companyName}. Gostaria de solicitar um novo empréstimo. Podemos conversar?`
    );
    const whatsLink = companyPhone 
        ? `https://wa.me/55${companyPhone.replace(/\D/g, '')}?text=${whatsMsg}`
        : '#';
   
    appDiv.innerHTML = `
        <div class="page-header">
            <a href="#my-loans" style="text-decoration:none;color:var(--text);">${icon('arrow-left')} Voltar</a>
            <h2>${icon('plus')} Solicitar Empréstimo</h2>
        </div>
       
        <div class="card" style="margin:16px 0;padding:24px;text-align:center;">
            <div style="font-size:3rem;">${icon('handshake')}</div>
            <h3 style="margin:12px 0;">Precisa de um novo empréstimo?</h3>
            <p style="color:var(--text-light);margin-bottom:20px;">
                Entre em contato conosco para solicitar um novo empréstimo. 
                Analisaremos seu pedido rapidamente!
            </p>
           
            ${companyPhone ? `
                <a href="${whatsLink}" target="_blank" rel="noopener"
                   class="btn" style="display:block;width:100%;padding:16px;background:#25D366;color:white;font-size:1rem;text-decoration:none;border-radius:12px;margin-bottom:12px;">
                    ${icon('message-circle')} Solicitar via WhatsApp
                </a>
               
                <a href="tel:+55${companyPhone.replace(/\D/g, '')}" 
                   class="btn" style="display:block;width:100%;padding:16px;background:var(--secondary);color:white;font-size:1rem;text-decoration:none;border-radius:12px;">
                    ${icon('phone')} Ligar: ${companyPhone}
                </a>
            ` : `
                <div class="card" style="padding:16px;background:var(--bg);">
                    <p>${icon('phone')} Entre em contato com <strong>${companyName}</strong> 
                    para solicitar seu empréstimo.</p>
                </div>
            `}
        </div>
       
        <div class="card" style="margin:16px 0;padding:16px;background:linear-gradient(135deg,#fff3cd,#ffeeba);border:none;">
            <p style="margin:0;color:#856404;font-size:0.85rem;">
                ${icon('info')} <strong>Como funciona:</strong> Após sua solicitação, 
                um administrador analisará e, se aprovado, o empréstimo 
                aparecerá automaticamente na sua tela "Meus Empréstimos".
            </p>
        </div>
       
        <div style="height:80px;"></div>
    `;
};

window.loadProfile = async function() {
    const appDiv = document.getElementById('app');
    const user = auth.currentUser;
    if (!user) { location.hash = '#login'; return; }
   
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
       
        // Buscar settings
        let settings = {};
        try { settings = await (typeof getSettings === 'function' ? getSettings() : {companyName: 'CerraLoan', companyPhone: ''}); } catch(e) {}
       
        // Buscar stats do cliente
        const loansSnap = await db.collection('loans')
            .where('clientId', '==', user.uid).get();
        let totalEmprestimos = loansSnap.size;
        let ativos = 0, quitados = 0, totalEmprestado = 0, totalPago = 0;
       
        for (const doc of loansSnap.docs) {
            const loan = doc.data();
            if (loan.status === 'active') ativos++;
            if (loan.status === 'paid') quitados++;
            totalEmprestado += loan.principalAmount || 0;
           
            const pSnap = await db.collection('loans').doc(doc.id).collection('payments').get();
            pSnap.forEach(p => { totalPago += p.data().amount || 0; });
        }
       
        const currentTheme = localStorage.getItem('cerraloan-theme');
        const isDark = currentTheme === 'dark';
       
        appDiv.innerHTML = `
            <div class="page-header">
                <h2>${icon('user')} Meu Perfil</h2>
            </div>
           
            <div class="card" style="margin:16px 0;padding:24px;text-align:center;">
                <div style="font-size:4rem;">${icon('user')}</div>
                <h3 style="margin:8px 0;">${userData.name || 'Cliente'}</h3>
                <p style="color:var(--text-light);">${userData.email || user.email}</p>
            </div>
           
            <div class="card" style="margin:16px 0;padding:16px;">
                <h4>${icon('clipboard')} Meus Dados</h4>
                <div style="margin-top:12px;">
                    <small style="color:var(--text-light);">Nome</small>
                    <p style="margin:4px 0 12px;"><strong>${userData.name || '-'}</strong></p>
                   
                    <small style="color:var(--text-light);">CPF</small>
                    <p style="margin:4px 0 12px;"><strong>${userData.cpf || '-'}</strong></p>
                   
                    <small style="color:var(--text-light);">Telefone</small>
                    <p style="margin:4px 0 12px;"><strong>${userData.phone || '-'}</strong></p>
                   
                    <small style="color:var(--text-light);">Email</small>
                    <p style="margin:4px 0 0;"><strong>${userData.email || user.email}</strong></p>
                </div>
            </div>
           
            <div class="card" style="margin:16px 0;padding:16px;">
                <h4>${icon('bar-chart')} Meu Histórico</h4>
                <div class="stats-grid" style="margin-top:12px;">
                    <div class="stat-card">
                        <div class="stat-value">${totalEmprestimos}</div>
                        <div class="stat-label">Empréstimos</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${ativos}</div>
                        <div class="stat-label">Ativos</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${typeof formatarMoeda === 'function' ? formatarMoeda(totalEmprestado) : formatarMoeda(totalEmprestado)}</div>
                        <div class="stat-label">Total Emprestado</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${typeof formatarMoeda === 'function' ? formatarMoeda(totalPago) : formatarMoeda(totalPago)}</div>
                        <div class="stat-label">Total Pago</div>
                    </div>
                </div>
            </div>
           
            <div class="card" style="margin:16px 0;padding:16px;">
                <h4>${icon('settings')} Preferências</h4>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 12px; margin-bottom: 8px;">
                    <span style="font-size:0.9rem;">${icon('moon')} Modo Escuro</span>
                    <label class="switch" style="position:relative; display:inline-block; width:40px; height:24px;">
                      <input type="checkbox" id="theme-toggle" ${isDark ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                      <span class="slider" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:#ccc; transition:.4s; border-radius:34px;"></span>
                      <style>
                        #theme-toggle:checked + .slider { background-color: var(--accent); }
                        .slider:before { position:absolute; content:""; height:16px; width:16px; left:4px; bottom:4px; background-color:white; transition:.4s; border-radius:50%; }
                        #theme-toggle:checked + .slider:before { transform: translateX(16px); }
                      </style>
                    </label>
                 </div>
            </div>
           
            <div class="card" style="margin:16px 0;padding:16px;">
                <h4>${icon('lock')} Alterar Senha</h4>
                <div style="margin-top:12px;">
                    <input type="password" id="current-password" placeholder="Senha atual" style="margin-bottom:8px;" />
                    <input type="password" id="new-password" placeholder="Nova senha (mín. 6 caracteres)" style="margin-bottom:8px;" />
                    <input type="password" id="confirm-password" placeholder="Confirmar nova senha" style="margin-bottom:12px;" />
                    <button class="btn btn-accent" style="width:100%;" id="btn-change-password">
                        Alterar Senha
                    </button>
                </div>
            </div>
           
            ${settings.companyPhone ? `
                <div class="card" style="margin:16px 0;padding:16px;">
                    <h4>${icon('phone')} Contato</h4>
                    <p style="margin:8px 0;">Dúvidas? Fale com:</p>
                    <p><strong>${settings.companyName || 'CerraLoan'}</strong></p>
                    <p>${icon('phone')} ${settings.companyPhone}</p>
                </div>
            ` : ''}
           
            <button class="btn" id="btn-logout"
                    style="width:100%;padding:16px;background:var(--accent);color:white;font-size:1rem;margin:16px 0;">
                ${icon('log-out')} Sair da Conta
            </button>
           
            <p style="text-align:center;color:var(--text-light);font-size:0.8rem;margin-bottom:100px;">
                CerraLoan v1.0 © 2025
            </p>
        `;
       
        // Lógica Dark Mode
        document.getElementById('theme-toggle')?.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('cerraloan-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('cerraloan-theme', 'light');
            }
        });
       
        // Event listeners
        document.getElementById('btn-change-password')?.addEventListener('click', async () => {
            const current = document.getElementById('current-password').value;
            const newPass = document.getElementById('new-password').value;
            const confirm = document.getElementById('confirm-password').value;
           
            if (!current || !newPass || !confirm) {
                if(window.showToast) showToast('Preencha todos os campos', 'error');
                return;
            }
            if (newPass.length < 6) {
                if(window.showToast) showToast('Senha deve ter no mínimo 6 caracteres', 'error');
                return;
            }
            if (newPass !== confirm) {
                if(window.showToast) showToast('As senhas não coincidem', 'error');
                return;
            }
           
            try {
                if(window.showLoading) showLoading();
                const credential = firebase.auth.EmailAuthProvider.credential(user.email, current);
                await user.reauthenticateWithCredential(credential);
                await user.updatePassword(newPass);
                if(window.hideLoading) hideLoading();
                if(window.showToast) showToast('Senha alterada com sucesso!', 'success');
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';
            } catch (error) {
                if(window.hideLoading) hideLoading();
                if(window.showToast) showToast(typeof translateAuthError === 'function' ? translateAuthError(error.code) : error.message, 'error');
            }
        });
       
        document.getElementById('btn-logout')?.addEventListener('click', () => {
            handleLogout();
        });
       
    } catch (error) {
        console.error('Erro loadProfile:', error);
        appDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-emoji">${icon('alert-triangle')}</div>
                <h3>Erro ao carregar perfil</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
};

// ===== VENDEDOR VIEWS =====

window.loadVendedorDashboard = async function() {
    const appDiv = document.getElementById('app');
    appDiv.innerHTML = `<div class="loading-container"><div class="spinner"></div></div>`;

    try {
        const user = auth.currentUser;
        if (!user) { location.hash = '#login'; return; }

        const userDoc = await db.collection('users').doc(user.uid).get();
        const userName = userDoc.exists ? userDoc.data().name : 'Vendedor';

        const proposals = await getProposals({ vendedorId: user.uid });
        const pending = proposals.filter(p => p.status === 'pending').length;
        const approvedProposals = proposals.filter(p => p.status === 'approved');
        const approved = approvedProposals.length;
        const rejected = proposals.filter(p => p.status === 'rejected').length;
        const totalVendido = approvedProposals.reduce((sum, p) => sum + (p.principalAmount || 0), 0);
        const totalComissao = approvedProposals.reduce((sum, p) => sum + (p.commissionAmount || 0), 0);

        const referralLink = `${location.origin}${location.pathname}#new-proposal?ref=${user.uid}`;

        appDiv.innerHTML = `
            <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
                <div><h1>${icon('bank')} CerraLoan</h1><p>Olá, ${userName}! </p></div>
                <button onclick="handleLogout()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;" title="Sair">${icon('log-out')}</button>
            </div>

            <div class="stats-grid" style="margin-top:16px;">
                <div class="stat-card">
                    <div class="stat-value">${pending}</div>
                    <div class="stat-label">${icon('clock')} Pendentes</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${approved}</div>
                    <div class="stat-label">${icon('check-circle')} Aprovadas</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${rejected}</div>
                    <div class="stat-label"><span class="status-dot" style="color:var(--danger);"></span> Rejeitadas</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatarMoeda(totalVendido)}</div>
                    <div class="stat-label">${icon('banknote')} Total Vendido</div>
                </div>
                <div class="stat-card" style="grid-column:span 2;">
                    <div class="stat-value" style="color:var(--success);">${formatarMoeda(totalComissao)}</div>
                    <div class="stat-label">${icon('dollar-sign')} Comissão Acumulada</div>
                </div>
            </div>

            <div class="card" style="margin-top:16px;">
                <h4 style="margin-bottom:8px;">${icon('handshake')} Link de Indicação</h4>
                <p style="font-size:0.8rem;color:var(--text-light);margin-bottom:12px;">
                    Compartilhe para que novas propostas já venham vinculadas a você.
                </p>
                <button class="btn btn-outline btn-block" id="btn-copy-referral">${icon('file-text')} Copiar Link de Indicação</button>
            </div>

            <h3 class="mt-3 mb-2">${icon('receipt')} Últimas Propostas</h3>
            <div id="vendedor-proposals-list">
                ${proposals.length === 0 ? (window.emptyState ? window.emptyState('receipt', 'Nenhuma proposta ainda', 'Envie sua primeira proposta de crédito para o gestor', '+ Nova Proposta', '#new-proposal') : '<p>Nenhuma proposta</p>') :
                    proposals.slice(0, 10).map(p => `
                        <div class="card" style="margin:8px 0;padding:16px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <strong>${icon('user')} ${p.clientName}</strong>
                                ${window.proposalStatusBadge(p.status)}
                            </div>
                            <small>${formatarMoeda(p.principalAmount)} • ${(p.dailyInterestRate * 100).toFixed(2)}%/dia</small>
                            ${p.status === 'approved' && p.commissionAmount ? `<br><small style="color:var(--success);">Comissão: ${formatarMoeda(p.commissionAmount)}</small>` : ''}
                        </div>
                    `).join('')}
            </div>

            <div style="margin:16px 0 100px;">
                <button class="btn btn-accent btn-block" onclick="location.hash='#new-proposal'">${icon('plus')} Nova Proposta de Crédito</button>
            </div>
        `;

        document.getElementById('btn-copy-referral')?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(referralLink);
                if (window.showToast) showToast('Link copiado!', 'success');
            } catch (e) {
                if (window.showToast) showToast(referralLink, 'success');
            }
        });
    } catch (error) {
        console.error('Erro loadVendedorDashboard:', error);
        appDiv.innerHTML = `<div class="empty-state"><h3>Erro ao carregar dados</h3><p>${error.message}</p></div>`;
    }
};

window.proposalStatusBadge = function(status) {
    if (status === 'approved') return `<span class="list-item-badge badge-success" style="background:rgba(0,184,148,0.15);color:var(--success);">${icon('check-circle')} Aprovada</span>`;
    if (status === 'rejected') return `<span class="list-item-badge badge-danger" style="background:rgba(214,48,49,0.15);color:var(--danger);">${icon('x-circle')} Rejeitada</span>`;
    return `<span class="list-item-badge badge-attention">${icon('clock')} Pendente</span>`;
};

window.loadNewProposal = async function() {
    const appDiv = document.getElementById('app');
    const user = auth.currentUser;
    const userDoc = user ? await db.collection('users').doc(user.uid).get() : null;
    const vendedorName = userDoc && userDoc.exists ? userDoc.data().name : '';
    const viaReferral = !!getHashParam('ref');

    appDiv.innerHTML = `
        <div class="page-header" style="display:flex; justify-content:space-between; align-items:center;">
             <button onclick="history.back()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;">${icon('arrow-left')}</button>
             <h2>${icon('plus')} Nova Proposta</h2>
        </div>
        ${viaReferral ? `<p style="font-size:0.8rem;color:var(--success);margin:-4px 0 12px;">${icon('handshake')} Aberto via link de indicação — a proposta já sai vinculada a ${vendedorName || 'você'}.</p>` : ''}
        <div class="card">
            <form id="new-proposal-form">
                <div class="input-group"><label>Nome do Cliente</label><input type="text" id="proposal-client-name" required></div>
                <div class="input-group"><label>CPF</label><input type="text" id="proposal-client-cpf" placeholder="000.000.000-00"></div>
                <div class="input-group"><label>Telefone</label><input type="text" id="proposal-client-phone" placeholder="(00) 00000-0000"></div>
                <div class="input-group"><label>Valor do Crédito (R$)</label><input type="number" id="proposal-amount" min="1" step="0.01" required></div>
                <div class="input-group"><label>Taxa Diária (%)</label><input type="number" id="proposal-rate" value="0.5" min="0.01" step="0.01" required></div>
                <div class="input-group"><label>Observações</label><input type="text" id="proposal-notes" placeholder="Opcional"></div>
                <button type="submit" class="btn btn-primary btn-block">Enviar Proposta ao Gestor</button>
            </form>
        </div>
    `;

    document.getElementById('new-proposal-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            if (window.showLoading) showLoading();
            await addProposal({
                clientName: document.getElementById('proposal-client-name').value.trim(),
                clientCpf: document.getElementById('proposal-client-cpf').value.trim(),
                clientPhone: document.getElementById('proposal-client-phone').value.trim(),
                principalAmount: document.getElementById('proposal-amount').value,
                dailyInterestRate: parseFloat(document.getElementById('proposal-rate').value) / 100,
                notes: document.getElementById('proposal-notes').value.trim(),
                vendedorName
            });
            if (window.hideLoading) hideLoading();
            if (window.showToast) showToast('Proposta enviada ao gestor!', 'success');
            location.hash = '#my-proposals';
        } catch (err) {
            if (window.hideLoading) hideLoading();
            if (window.showToast) showToast('Erro: ' + err.message, 'error');
        }
    });
};

window.loadMyProposals = async function() {
    const appDiv = document.getElementById('app');
    appDiv.innerHTML = `<div class="loading-container"><div class="spinner"></div></div>`;

    try {
        const user = auth.currentUser;
        const proposals = await getProposals({ vendedorId: user.uid });

        appDiv.innerHTML = `
            <div class="page-header"><h1>${icon('receipt')} Minhas Propostas</h1></div>
            <div id="my-proposals-list">
                ${proposals.length === 0 ? (window.emptyState ? window.emptyState('receipt', 'Nenhuma proposta ainda', 'Envie sua primeira proposta de crédito', '+ Nova Proposta', '#new-proposal') : '<p>Nenhuma proposta</p>') :
                    proposals.map(p => `
                        <div class="card" style="margin:8px 0;padding:16px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <strong>${icon('user')} ${p.clientName}</strong>
                                ${window.proposalStatusBadge(p.status)}
                            </div>
                            <small>${formatarMoeda(p.principalAmount)} • ${(p.dailyInterestRate * 100).toFixed(2)}%/dia</small>
                            ${p.notes ? `<br><small style="color:var(--text-light);">${p.notes}</small>` : ''}
                            ${p.status === 'rejected' && p.rejectReason ? `<br><small style="color:var(--danger);">Motivo: ${p.rejectReason}</small>` : ''}
                        </div>
                    `).join('')}
            </div>
            <div style="margin:16px 0 100px;">
                <button class="btn btn-accent btn-block" onclick="location.hash='#new-proposal'">${icon('plus')} Nova Proposta</button>
            </div>
        `;
    } catch (error) {
        appDiv.innerHTML = `<div class="empty-state">Erro: ${error.message}</div>`;
    }
};

// ===== ADMIN: PROPOSTAS DE VENDEDORES =====

window.loadProposals = async function() {
    const appDiv = document.getElementById('app');
    appDiv.innerHTML = `<div class="loading-container"><div class="spinner"></div></div>`;

    try {
        const proposals = await getProposals();
        const pending = proposals.filter(p => p.status === 'pending');
        const resolved = proposals.filter(p => p.status !== 'pending');

        appDiv.innerHTML = `
            <div class="page-header" style="display:flex; justify-content:space-between; align-items:center;">
                 <button onclick="history.back()" style="background:none;border:none;font-size:1.1rem;cursor:pointer;white-space:nowrap;">${icon('arrow-left')} Voltar</button>
                 <h2>${icon('receipt')} Propostas de Vendedores</h2>
            </div>

            <h3 class="mt-2 mb-2">⏳ Pendentes (${pending.length})</h3>
            <div id="pending-proposals-list">
                ${pending.length === 0 ? '<p style="color:var(--text-light);">Nenhuma proposta pendente.</p>' :
                    pending.map(p => `
                        <div class="card" style="margin:8px 0;padding:16px;">
                            <strong>${icon('user')} ${p.clientName}</strong> <small>(via ${p.vendedorName || 'vendedor'})</small><br>
                            <small>${formatarMoeda(p.principalAmount)} • ${(p.dailyInterestRate * 100).toFixed(2)}%/dia</small>
                            ${p.notes ? `<br><small style="color:var(--text-light);">${p.notes}</small>` : ''}
                            <div style="display:flex;gap:12px;margin-top:12px;">
                                <button class="btn btn-success btn-block" data-approve="${p.id}">${icon('check-circle')} Aprovar</button>
                                <button class="btn btn-outline btn-block" data-reject="${p.id}">${icon('x-circle')} Rejeitar</button>
                            </div>
                        </div>
                    `).join('')}
            </div>

            <h3 class="mt-3 mb-2">${icon('file-text')} Histórico</h3>
            <div id="resolved-proposals-list" style="margin-bottom:100px;">
                ${resolved.length === 0 ? '<p style="color:var(--text-light);">Sem propostas analisadas ainda.</p>' :
                    resolved.map(p => `
                        <div class="card" style="margin:8px 0;padding:16px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <strong>${icon('user')} ${p.clientName}</strong>
                                ${window.proposalStatusBadge(p.status)}
                            </div>
                            <small>${formatarMoeda(p.principalAmount)} • via ${p.vendedorName || 'vendedor'}</small>
                        </div>
                    `).join('')}
            </div>
        `;

        appDiv.querySelectorAll('[data-approve]').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('Aprovar esta proposta e criar o empréstimo?')) return;
                try {
                    if (window.showLoading) showLoading();
                    await approveProposal(btn.getAttribute('data-approve'));
                    if (window.hideLoading) hideLoading();
                    if (window.showToast) showToast('Proposta aprovada! Empréstimo criado.', 'success');
                    await window.loadProposals();
                } catch (err) {
                    if (window.hideLoading) hideLoading();
                    if (window.showToast) showToast('Erro: ' + err.message, 'error');
                }
            });
        });

        appDiv.querySelectorAll('[data-reject]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const reason = prompt('Motivo da rejeição (opcional):') || '';
                try {
                    if (window.showLoading) showLoading();
                    await rejectProposal(btn.getAttribute('data-reject'), reason);
                    if (window.hideLoading) hideLoading();
                    if (window.showToast) showToast('Proposta rejeitada.', 'success');
                    await window.loadProposals();
                } catch (err) {
                    if (window.hideLoading) hideLoading();
                    if (window.showToast) showToast('Erro: ' + err.message, 'error');
                }
            });
        });
    } catch (error) {
        appDiv.innerHTML = `<div class="empty-state">Erro: ${error.message}</div>`;
    }
};
