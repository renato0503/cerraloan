function diasEntre(dataInicio, dataFim) {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    
    inicio.setHours(0, 0, 0, 0);
    fim.setHours(0, 0, 0, 0);
    
    const diffTime = fim.getTime() - inicio.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
}

function calcularSaldo(principalAmount, dailyInterestRate, startDate, payments, targetDate) {
    const sortedPayments = [...payments].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let saldo = principalAmount;
    let jurosAcumulados = 0;
    let totalPago = 0;
    let ultimaData = new Date(startDate);
    const target = new Date(targetDate);
    
    for (const payment of sortedPayments) {
        const paymentDate = new Date(payment.date);
        
        if (paymentDate > target) {
            break;
        }
        
        const dias = diasEntre(ultimaData, paymentDate);
        if (dias > 0) {
            const juros = saldo * dailyInterestRate * dias;
            jurosAcumulados += juros;
            saldo += juros;
        }
        
        totalPago += payment.amount;
        saldo -= payment.amount;
        
        ultimaData = paymentDate;
    }
    
    if (ultimaData < target) {
        const diasRestantes = diasEntre(ultimaData, target);
        if (diasRestantes > 0) {
            const juros = saldo * dailyInterestRate * diasRestantes;
            jurosAcumulados += juros;
            saldo += juros;
        }
    }
    
    saldo = Math.max(0, saldo);
    
    const diasCorridos = diasEntre(startDate, target);
    
    return {
        saldoDevedor: Math.round(saldo * 100) / 100,
        jurosAcumulados: Math.round(jurosAcumulados * 100) / 100,
        totalPago: Math.round(totalPago * 100) / 100,
        diasCorridos
    };
}

function gerarProjecao(principalAmount, dailyRate, startDate, payments, diasFuturos) {
    const projecao = [];
    const start = new Date(startDate);
    const hoje = new Date();
    
    for (let i = 0; i <= diasFuturos; i++) {
        const data = new Date(hoje);
        data.setDate(data.getDate() + i);
        
        const saldo = calcularSaldo(
            principalAmount,
            dailyRate,
            start,
            payments,
            data
        );
        
        projecao.push({
            data: new Date(data),
            saldo: saldo.saldoDevedor
        });
    }
    
    return projecao;
}

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function formatarData(date) {
    const d = new Date(date);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
}

// Score de risco simples (100% local, sem serviço externo de crédito).
// Cada empréstimo do cliente soma ou subtrai pontos com base no status/atraso atual.
function calcularScoreCliente(loans) {
    if (!loans || loans.length === 0) {
        return { pontos: 0, nivel: 'novo', label: 'Sem histórico' };
    }

    let pontos = 0;
    const hoje = new Date();

    for (const loan of loans) {
        if (loan.status === 'paid') {
            pontos += 2;
            continue;
        }
        const startDate = loan.startDate?.toDate ? loan.startDate.toDate() : new Date(loan.startDate);
        const dias = diasEntre(startDate, hoje);
        if (dias > 60) pontos -= 2;
        else if (dias > 30) pontos -= 1;
        else if (dias > 15) pontos += 0;
        else pontos += 1;
    }

    if (pontos >= 2) return { pontos, nivel: 'bom', label: 'Bom pagador' };
    if (pontos >= 0) return { pontos, nivel: 'medio', label: 'Risco médio' };
    return { pontos, nivel: 'ruim', label: 'Risco alto' };
}
