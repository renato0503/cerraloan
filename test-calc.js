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

function testarCenario(nome, resultado, esperado, tolerancia = 0.01) {
    const diff = Math.abs(resultado - esperado);
    if (diff <= tolerancia) {
        console.log(`✅ ${nome}: PASSOU (esperado: ${esperado}, obtido: ${resultado})`);
        return true;
    } else {
        console.log(`❌ ${nome}: FALHOU (esperado: ${esperado}, obtido: ${resultado})`);
        return false;
    }
}

console.log('=== Testes do Motor de Cálculo de Juros ===\n');

let passed = 0;
let total = 0;

console.log('--- Cenário 1: Sem pagamentos ---');
total++;
const c1_dia10 = calcularSaldo(1000, 0.005, '2024-01-01', [], '2024-01-11');
if (testarCenario('Cenário 1 - Dia 10', c1_dia10.saldoDevedor, 1050.00)) passed++;

total++;
const c1_dia30 = calcularSaldo(1000, 0.005, '2024-01-01', [], '2024-01-31');
if (testarCenario('Cenário 1 - Dia 30', c1_dia30.saldoDevedor, 1150.00)) passed++;

console.log('\n--- Cenário 2: Um pagamento parcial ---');
total++;
const c2_dia10 = calcularSaldo(1000, 0.005, '2024-01-01', [{amount: 300, date: '2024-01-11'}], '2024-01-11');
if (testarCenario('Cenário 2 - Dia 10 (após pagamento)', c2_dia10.saldoDevedor, 750)) passed++;

total++;
const c2_dia20 = calcularSaldo(1000, 0.005, '2024-01-01', [{amount: 300, date: '2024-01-11'}], '2024-01-21');
if (testarCenario('Cenário 2 - Dia 20', c2_dia20.saldoDevedor, 787.50)) passed++;

total++;
const c2_dia25 = calcularSaldo(1000, 0.005, '2024-01-01', [{amount: 300, date: '2024-01-11'}], '2024-01-26');
if (testarCenario('Cenário 2 - Dia 25', c2_dia25.saldoDevedor, 806.25)) passed++;

console.log('\n--- Cenário 3: Múltiplos pagamentos ---');
total++;
const c3_dia5 = calcularSaldo(1000, 0.005, '2024-01-01', [{amount: 500, date: '2024-01-06'}], '2024-01-06');
if (testarCenario('Cenário 3 - Dia 5 (após pagamento)', c3_dia5.saldoDevedor, 525)) passed++;

total++;
const c3_dia15 = calcularSaldo(1000, 0.005, '2024-01-01', [
    {amount: 500, date: '2024-01-06'},
    {amount: 200, date: '2024-01-16'}
], '2024-01-16');
if (testarCenario('Cenário 3 - Dia 15 (após segundo pagamento)', c3_dia15.saldoDevedor, 351.25)) passed++;

total++;
const c3_dia20 = calcularSaldo(1000, 0.005, '2024-01-01', [
    {amount: 500, date: '2024-01-06'},
    {amount: 200, date: '2024-01-16'}
], '2024-01-21');
if (testarCenario('Cenário 3 - Dia 20', c3_dia20.saldoDevedor, 360.03)) passed++;

console.log(`\n🎯 Resultado: ${passed}/${total} testes passaram`);

if (passed === total) {
    console.log('\n✅ Todos os testes passaram! O motor de cálculo está correto.');
    process.exit(0);
} else {
    console.log('\n❌ Alguns testes falharam. Revise o motor de cálculo.');
    process.exit(1);
}
