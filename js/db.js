async function getSettings() {
    try {
        const doc = await db.collection('settings').doc('general').get();
        return doc.exists 
            ? doc.data() 
            : { defaultDailyRate: 0.005, companyName: 'CerraLoan', companyPhone: '' };
    } catch (error) {
        console.error('Erro getSettings:', error);
        return { defaultDailyRate: 0.005, companyName: 'CerraLoan', companyPhone: '' };
    }
}

async function addClient(data) {
    const secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");
    const secondaryAuth = secondaryApp.auth();

    try {
        const userCredential = await secondaryAuth.createUserWithEmailAndPassword(data.email, data.password);
        const uid = userCredential.user.uid;

        await db.collection('users').doc(uid).set({
            name: data.name,
            email: data.email,
            phone: data.phone,
            cpf: data.cpf,
            role: 'client',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await secondaryAuth.signOut();
        await secondaryApp.delete();

        if (typeof addLog === 'function') await addLog('client_created', `Cadastrou cliente: ${data.name}`, uid);
        return uid;
    } catch (error) {
        try { await secondaryApp.delete(); } catch (e) {}
        throw error;
    }
}

async function getClients() {
    const snapshot = await db.collection('users')
        .where('role', '==', 'client')
        .get();

    const clients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    
    clients.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
    return clients;
}

async function getClient(id) {
    const doc = await db.collection('users').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
}

async function updateClient(id, data) {
    await db.collection('users').doc(id).update(data);
}

async function searchClients(query) {
    const clients = await getClients();
    const q = query.toLowerCase();
    return clients.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.cpf && c.cpf.replace(/\D/g, '').includes(q.replace(/\D/g, '')))
    );
}

async function addLoan(data) {
    const adminUser = auth.currentUser;
    const docRef = await db.collection('loans').add({
        clientId: data.clientId,
        clientName: data.clientName,
        principalAmount: parseFloat(data.principalAmount),
        dailyInterestRate: parseFloat(data.dailyInterestRate),
        startDate: data.startDate,
        notes: data.notes || '',
        status: 'active',
        createdBy: adminUser ? adminUser.uid : 'admin',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    let format = typeof window.formatarMoeda === 'function' ? window.formatarMoeda(data.principalAmount) : data.principalAmount;
    if (typeof addLog === 'function') await addLog('loan_created', `Criou empréstimo de ${format} para ${data.clientName}`, docRef.id);
    return docRef.id;
}

async function getLoans(filters = {}) {
    const snapshot = await db.collection('loans').get();
    let loans = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    
    // Sort desc by createdAt
    loans.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
    });

    if (filters.status) {
        loans = loans.filter(l => l.status === filters.status);
    }
    if (filters.clientId) {
        loans = loans.filter(l => l.clientId === filters.clientId);
    }

    const hoje = new Date();
    for (const loan of loans) {
        const paymentsSnap = await db.collection('loans').doc(loan.id).collection('payments').get();
        const payments = paymentsSnap.docs.map(p => ({
            id: p.id,
            ...p.data()
        }));
        const saldoInfo = calcularSaldo(
            loan.principalAmount,
            loan.dailyInterestRate,
            loan.startDate,
            payments,
            hoje
        );
        loan.currentBalance = saldoInfo.saldoDevedor;
    }

    return loans;
}

async function getLoan(id) {
    const loanDoc = await db.collection('loans').doc(id).get();
    if (!loanDoc.exists) return null;

    const loan = { id: loanDoc.id, ...loanDoc.data() };

    const paymentsSnap = await db.collection('loans').doc(id)
        .collection('payments')
        .get();

    const payments = paymentsSnap.docs.map(p => ({
        id: p.id,
        ...p.data()
    }));
    
    payments.sort((a,b) => {
        const dA = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
        const dB = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
        return dB - dA;
    });

    const hoje = new Date();
    const saldoInfo = calcularSaldo(
        loan.principalAmount,
        loan.dailyInterestRate,
        loan.startDate,
        payments,
        hoje
    );
    loan.currentBalance = saldoInfo.saldoDevedor;
    loan.totalPaid = saldoInfo.totalPago;
    loan.accruedInterest = saldoInfo.jurosAcumulados;

    return { loan, payments };
}

async function updateLoanStatus(id, status) {
    await db.collection('loans').doc(id).update({ status });
    if (typeof addLog === 'function') await addLog('status_changed', `Alterou status do empréstimo ${id} para ${status}`, id);
}

// Renegociação de dívida (Sprint 11 do roadmap): fecha o empréstimo atual como
// "renegotiated" e abre um novo contrato vinculado a ele (renegotiatedFrom).
async function renegotiateLoan(loanId, { newPrincipal, newDailyRate, newStartDate, motivo }) {
    const { loan } = await getLoan(loanId);
    if (loan.status !== 'active') throw new Error('Só é possível renegociar um empréstimo ativo');

    const principal = newPrincipal != null ? parseFloat(newPrincipal) : loan.currentBalance;

    const newLoanId = await addLoan({
        clientId: loan.clientId,
        clientName: loan.clientName,
        principalAmount: principal,
        dailyInterestRate: newDailyRate != null ? parseFloat(newDailyRate) : loan.dailyInterestRate,
        startDate: newStartDate || new Date().toISOString(),
        notes: motivo || `Renegociação do empréstimo anterior (${loanId})`
    });

    await db.collection('loans').doc(newLoanId).update({ renegotiatedFrom: loanId });
    await db.collection('loans').doc(loanId).update({
        status: 'renegotiated', renegotiatedTo: newLoanId
    });

    if (typeof addLog === 'function') {
        await addLog('loan_renegotiated', `Renegociou empréstimo de ${loan.clientName}`, loanId);
    }
    return newLoanId;
}

async function addPayment(loanId, data) {
    const adminUser = auth.currentUser;

    await db.collection('loans').doc(loanId).collection('payments').add({
        amount: parseFloat(data.amount),
        date: data.date,
        type: data.type || 'partial',
        registeredBy: adminUser ? adminUser.uid : 'admin',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    const loanData = await getLoan(loanId);
    if (loanData.loan.currentBalance <= 0) {
        await updateLoanStatus(loanId, 'paid');
    }
    
    let format = typeof window.formatarMoeda === 'function' ? window.formatarMoeda(data.amount) : data.amount;
    if (typeof addLog === 'function') await addLog('payment_registered', `Registrou pagamento de ${format} no empréstimo de ${loanData.loan.clientName}`, loanId);
}

async function getPayments(loanId) {
    const snapshot = await db.collection('loans').doc(loanId)
        .collection('payments')
        .get();

    const payments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    
    payments.sort((a,b) => {
        const dA = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
        const dB = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
        return dB - dA;
    });
    
    return payments;
}

// Sugere quais empréstimos ativos já passaram do prazo configurado sem pagamento
// (regra automática de cobrança - Sprint 10 do roadmap).
async function getCobrancasSugeridas() {
    const settings = await getSettings();
    const ruleDays = settings.reminderRuleDays || 5;
    const loans = await getLoans({ status: 'active' });
    const hoje = new Date();

    const sugeridas = [];
    for (const loan of loans) {
        const payments = await getPayments(loan.id);
        const ultimaData = payments.length > 0
            ? payments.map(p => p.date?.toDate ? p.date.toDate() : new Date(p.date)).sort((a, b) => b - a)[0]
            : (loan.startDate?.toDate ? loan.startDate.toDate() : new Date(loan.startDate));
        const diasSemPagamento = diasEntre(ultimaData, hoje);
        if (diasSemPagamento >= ruleDays) {
            loan.diasSemPagamento = diasSemPagamento;
            sugeridas.push(loan);
        }
    }
    sugeridas.sort((a, b) => b.diasSemPagamento - a.diasSemPagamento);
    return sugeridas;
}

async function getDashboardStats() {
    try {
        // Total de clientes
        const clientsSnap = await db.collection('users')
            .where('role', '==', 'client').get();
        const totalClients = clientsSnap.size;
        
        // Todos os empréstimos
        const loansSnap = await db.collection('loans').get();
        let activeLoans = 0;
        let paidLoans = 0;
        let totalLent = 0;
        let totalActiveBalance = 0;
        let recentLoans = [];
        
        for (const doc of loansSnap.docs) {
            const loan = { id: doc.id, ...doc.data() };
            
            if (loan.status === 'active') activeLoans++;
            if (loan.status === 'paid') paidLoans++;
            totalLent += loan.principalAmount || 0;
            
            // Para empréstimos ativos, calcular saldo atual
            if (loan.status === 'active') {
                const paymentsSnap = await db.collection('loans')
                    .doc(doc.id).collection('payments').get();
                const payments = paymentsSnap.docs.map(p => ({
                    amount: p.data().amount,
                    date: p.data().date?.toDate ? p.data().date.toDate() : new Date(p.data().date)
                }));
                
                const startDate = loan.startDate?.toDate ? loan.startDate.toDate() : new Date(loan.startDate);
                const resultado = calcularSaldo(
                    loan.principalAmount,
                    loan.dailyInterestRate,
                    startDate,
                    payments,
                    new Date()
                );
                
                totalActiveBalance += resultado.saldoDevedor || resultado;
                loan.currentBalance = resultado.saldoDevedor || resultado;
            } else {
                loan.currentBalance = 0;
            }
            
            recentLoans.push(loan);
        }
        
        // Ordenar por createdAt desc e pegar top 5
        recentLoans.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA;
        });
        recentLoans = recentLoans.slice(0, 5);
        
        return {
            totalClients,
            activeLoans,
            paidLoans,
            totalLent,
            totalActiveBalance,
            recentLoans
        };
        
    } catch (error) {
        console.error('Erro getDashboardStats:', error);
        return {
            totalClients: 0,
            activeLoans: 0,
            paidLoans: 0,
            totalLent: 0,
            totalActiveBalance: 0,
            recentLoans: []
        };
    }
}

async function getClientLoanCount(clientId) {
    const loans = await getLoans({ clientId, status: 'active' });
    return loans.length;
}

async function getSettings() {
    try {
        const doc = await db.collection('settings').doc('general').get();
        if (doc.exists) {
            return doc.data();
        }
    } catch (e) {}
    return { defaultDailyRate: 0.005, companyName: 'CerraLoan', companyPhone: '' };
}

async function saveSettings(data) {
    await db.collection('settings').doc('general').set(data, { merge: true });
}

async function getGeneralStats() {
    const clientsSnap = await db.collection('users').where('role', '==', 'client').get();
    const totalClients = clientsSnap.size;

    const loansSnap = await db.collection('loans').get();
    let activeLoans = 0, paidLoans = 0, totalLent = 0, totalReceived = 0;

    for (const doc of loansSnap.docs) {
        const loan = doc.data();
        if (loan.status === 'active') activeLoans++;
        if (loan.status === 'paid') paidLoans++;
        totalLent += loan.principalAmount || 0;

        const paymentsSnap = await db.collection('loans').doc(doc.id).collection('payments').get();
        paymentsSnap.forEach(p => { totalReceived += p.data().amount || 0; });
    }

    return { totalClients, activeLoans, paidLoans, totalLoans: loansSnap.size, totalLent, totalReceived };
}

async function deleteLoan(loanId) {
    const payments = await db.collection('loans').doc(loanId).collection('payments').get();
    if (!payments.empty) {
        throw new Error('Nao e possivel excluir: existem pagamentos registrados');
    }
    await db.collection('loans').doc(loanId).delete();
    if (typeof addLog === 'function') await addLog('loan_deleted', `Excluiu empréstimo ${loanId}`, loanId);
}

async function deleteClient(clientId) {
    const loans = await db.collection('loans')
        .where('clientId', '==', clientId)
        .where('status', '==', 'active')
        .get();
    if (!loans.empty) {
        throw new Error('Nao e possivel excluir: cliente possui emprestimos ativos');
    }
    await db.collection('users').doc(clientId).delete();
    if (typeof addLog === 'function') await addLog('client_deleted', `Excluiu cliente ${clientId}`, clientId);
}

// ==========================================
// AUDITORIA (LOGS)
// ==========================================
async function addLog(action, description, targetId = '') {
    try {
        const user = auth.currentUser;
        if (!user) return;
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userName = userDoc.exists ? userDoc.data().name : user.email;
        
        await db.collection('logs').add({
            action,
            description,
            userId: user.uid,
            userName,
            targetId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch(e) {
        console.error('Erro ao salvar log:', e);
    }
}

// ==========================================
// LEMBRETES (WHATSAPP COBRANÇAS)
// ==========================================
async function addReminder(loanId, data) {
    return await db.collection('loans').doc(loanId)
        .collection('reminders').add({
            ...data,
            sentAt: firebase.firestore.FieldValue.serverTimestamp()
        });
}

async function getReminders(loanId) {
    const snap = await db.collection('loans').doc(loanId)
        .collection('reminders').get();
    const reminders = [];
    snap.forEach(doc => reminders.push({ id: doc.id, ...doc.data() }));
    reminders.sort((a, b) => {
        const da = a.sentAt?.toDate ? a.sentAt.toDate() : new Date(0);
        const db2 = b.sentAt?.toDate ? b.sentAt.toDate() : new Date(0);
        return db2 - da;
    });
    return reminders;
}

async function getLastReminder(loanId) {
    const reminders = await getReminders(loanId);
    return reminders.length > 0 ? reminders[0] : null;
}

// ==========================================
// HISTÓRICO DE SIMULAÇÕES (sinal de intenção de pagamento - Sprint 19 do roadmap)
// ==========================================
async function addSimulation(loanId, targetDate, saldoSimulado) {
    return await db.collection('loans').doc(loanId).collection('simulations').add({
        targetDate: targetDate.toISOString(),
        saldoSimulado,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

async function getSimulations(loanId) {
    const snap = await db.collection('loans').doc(loanId).collection('simulations').get();
    const simulations = [];
    snap.forEach(doc => simulations.push({ id: doc.id, ...doc.data() }));
    simulations.sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const db2 = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return db2 - da;
    });
    return simulations;
}

// ==========================================
// COMPROVANTES DE PAGAMENTO ENVIADOS PELO CLIENTE (Sprint 19 do roadmap)
// ==========================================
async function addPaymentProof(loanId, data) {
    return await db.collection('loans').doc(loanId).collection('proofs').add({
        ...data,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

async function getPaymentProofs(loanId) {
    const snap = await db.collection('loans').doc(loanId).collection('proofs').get();
    const proofs = [];
    snap.forEach(doc => proofs.push({ id: doc.id, ...doc.data() }));
    proofs.sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const db2 = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return db2 - da;
    });
    return proofs;
}

async function confirmPaymentProof(loanId, proofId) {
    const proofDoc = await db.collection('loans').doc(loanId).collection('proofs').doc(proofId).get();
    if (!proofDoc.exists) throw new Error('Comprovante não encontrado');
    const proof = proofDoc.data();

    await addPayment(loanId, { amount: proof.amount, date: proof.date, type: proof.type || 'partial' });

    await db.collection('loans').doc(loanId).collection('proofs').doc(proofId).update({
        status: 'confirmed', confirmedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

async function rejectPaymentProof(loanId, proofId, reason = '') {
    await db.collection('loans').doc(loanId).collection('proofs').doc(proofId).update({
        status: 'rejected', rejectReason: reason
    });
}

// ==========================================
// PROPOSTAS (VENDEDOR -> GESTOR)
// ==========================================
async function addProposal(data) {
    const vendedor = auth.currentUser;
    const docRef = await db.collection('proposals').add({
        clientName: data.clientName,
        clientCpf: data.clientCpf || '',
        clientPhone: data.clientPhone || '',
        principalAmount: parseFloat(data.principalAmount),
        dailyInterestRate: parseFloat(data.dailyInterestRate),
        notes: data.notes || '',
        status: 'pending',
        vendedorId: vendedor ? vendedor.uid : '',
        vendedorName: data.vendedorName || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    if (typeof addLog === 'function') {
        let format = typeof window.formatarMoeda === 'function' ? window.formatarMoeda(data.principalAmount) : data.principalAmount;
        await addLog('proposal_created', `Enviou proposta de ${format} para ${data.clientName}`, docRef.id);
    }
    return docRef.id;
}

async function getProposals(filters = {}) {
    const snapshot = await db.collection('proposals').get();
    let proposals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    proposals.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
    });

    if (filters.status) proposals = proposals.filter(p => p.status === filters.status);
    if (filters.vendedorId) proposals = proposals.filter(p => p.vendedorId === filters.vendedorId);

    return proposals;
}

async function approveProposal(proposalId) {
    const doc = await db.collection('proposals').doc(proposalId).get();
    if (!doc.exists) throw new Error('Proposta não encontrada');
    const proposal = doc.data();
    if (proposal.status !== 'pending') throw new Error('Esta proposta já foi analisada');

    const adminUser = auth.currentUser;
    const clientRef = await db.collection('users').add({
        name: proposal.clientName,
        cpf: proposal.clientCpf || '',
        phone: proposal.clientPhone || '',
        role: 'client',
        createdBy: 'proposal:' + proposalId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    const loanId = await addLoan({
        clientId: clientRef.id,
        clientName: proposal.clientName,
        principalAmount: proposal.principalAmount,
        dailyInterestRate: proposal.dailyInterestRate,
        startDate: new Date().toISOString(),
        notes: proposal.notes
    });

    const settings = await getSettings();
    const commissionRate = settings.commissionRate || 0;
    const commissionAmount = Math.round(proposal.principalAmount * commissionRate * 100) / 100;

    await db.collection('proposals').doc(proposalId).update({
        status: 'approved',
        clientId: clientRef.id,
        loanId,
        commissionRate,
        commissionAmount,
        approvedBy: adminUser ? adminUser.uid : '',
        approvedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    if (typeof addLog === 'function') {
        await addLog('proposal_approved', `Aprovou proposta de ${proposal.clientName} e criou empréstimo`, proposalId);
    }
}

async function rejectProposal(proposalId, reason = '') {
    await db.collection('proposals').doc(proposalId).update({
        status: 'rejected',
        rejectReason: reason,
        rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    if (typeof addLog === 'function') {
        await addLog('proposal_rejected', `Rejeitou proposta ${proposalId}`, proposalId);
    }
}
