// ========================================
// RELATÓRIOS E EXPORTAÇÕES - CerraLoan
// ========================================

// --- RECIBO DE PAGAMENTO (PDF) ---
function gerarReciboPagamento(loan, payment, clientData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('CerraLoan', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Gestão de Microcrédito', 105, 27, { align: 'center' });
    
    // Linha divisória
    doc.setDrawColor(200);
    doc.line(20, 32, 190, 32);
    
    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RECIBO DE PAGAMENTO', 105, 45, { align: 'center' });
    
    // Dados
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    let y = 60;
    
    const addLine = (label, value) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 25, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value), 90, y);
        y += 8;
    };
    
    addLine('Cliente:', clientData.name || '-');
    addLine('CPF:', clientData.cpf || '-');
    addLine('Data do Pagamento:', formatarData(payment.date));
    addLine('Valor Pago:', formatarMoeda(payment.amount));
    addLine('Tipo:', payment.type === 'full' ? 'Quitação Total' : 'Pagamento Parcial');
    
    y += 5;
    doc.setDrawColor(200);
    doc.line(20, y, 190, y);
    y += 10;
    
    addLine('Empréstimo Original:', formatarMoeda(loan.principalAmount));
    addLine('Taxa Diária:', (loan.dailyInterestRate * 100).toFixed(1) + '% ao dia');
    addLine('Data do Empréstimo:', formatarData(loan.startDate));
    
    // Rodapé
    y += 15;
    doc.setFontSize(9);
    doc.setTextColor(128);
    doc.text('Documento gerado automaticamente pelo sistema CerraLoan', 105, y, { align: 'center' });
    doc.text('Data de emissão: ' + formatarData(new Date()) + ' às ' + new Date().toLocaleTimeString('pt-BR'), 105, y + 5, { align: 'center' });
    
    // Salvar
    doc.save(`recibo_${clientData.name?.replace(/\s/g, '_') || 'cliente'}_${Date.now()}.pdf`);
}

// --- RELATÓRIO DE EMPRÉSTIMOS (PDF) ---
async function gerarRelatorioPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    if(window.showLoading) showLoading();
    
    try {
        const loans = await getLoans();
        const hoje = new Date();
        
        // Calcular saldo de cada empréstimo
        const loansComSaldo = [];
        for (const loan of loans) {
            if (loan.status === 'active') {
                const payments = await getPayments(loan.id);
                const paymentsList = payments.map(p => ({
                    amount: p.amount,
                    date: p.date?.toDate ? p.date.toDate() : new Date(p.date)
                }));
                const startDate = loan.startDate?.toDate ? loan.startDate.toDate() : new Date(loan.startDate);
                const resultado = calcularSaldo(loan.principalAmount, loan.dailyInterestRate, startDate, paymentsList, hoje);
                loan.saldoHoje = typeof resultado === 'object' ? resultado.saldoDevedor : resultado;
            } else {
                loan.saldoHoje = 0;
            }
            loansComSaldo.push(loan);
        }
        
        // Cabeçalho
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('CerraLoan - Relatório de Empréstimos', 105, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Gerado em: ' + formatarData(hoje) + ' às ' + hoje.toLocaleTimeString('pt-BR'), 105, 22, { align: 'center' });
        
        // Resumo
        const ativos = loansComSaldo.filter(l => l.status === 'active');
        const quitados = loansComSaldo.filter(l => l.status === 'paid');
        const totalDevedor = ativos.reduce((sum, l) => sum + (l.saldoHoje || 0), 0);
        
        doc.setFontSize(11);
        let y = 35;
        doc.text(`Total de Empréstimos: ${loansComSaldo.length} (${ativos.length} ativos, ${quitados.length} quitados)`, 20, y);
        y += 7;
        doc.text(`Saldo Devedor Total: ${formatarMoeda(totalDevedor)}`, 20, y);
        y += 12;
        
        // Tabela
        const tableData = loansComSaldo.map(l => [
            l.clientName || '-',
            formatarMoeda(l.principalAmount),
            (l.dailyInterestRate * 100).toFixed(1) + '%',
            l.status === 'active' ? formatarMoeda(l.saldoHoje) : 'QUITADO',
            l.status === 'active' ? 'Ativo' : 'Quitado'
        ]);
        
        doc.autoTable({
            startY: y,
            head: [['Cliente', 'Valor Original', 'Taxa/dia', 'Saldo Hoje', 'Status']],
            body: tableData,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [22, 33, 62] },
            alternateRowStyles: { fillColor: [248, 249, 250] }
        });
        
        doc.save(`relatorio_cerraloan_${hoje.toISOString().split('T')[0]}.pdf`);
        if(window.hideLoading) hideLoading();
        if(window.showToast) showToast('Relatório PDF gerado!', 'success');
        
    } catch(error) {
        if(window.hideLoading) hideLoading();
        console.error('Erro ao gerar relatório:', error);
        if(window.showToast) showToast('Erro ao gerar relatório', 'error');
    }
}

// --- EXPORTAR PARA EXCEL/CSV ---
async function exportarExcel() {
    if(window.showLoading) showLoading();
    
    try {
        const loans = await getLoans();
        const hoje = new Date();
        
        const dados = [];
        for (const loan of loans) {
            let saldoHoje = 0;
            let totalPago = 0;
            
            if (loan.status === 'active') {
                const payments = await getPayments(loan.id);
                const paymentsList = payments.map(p => ({
                    amount: p.amount,
                    date: p.date?.toDate ? p.date.toDate() : new Date(p.date)
                }));
                totalPago = paymentsList.reduce((s, p) => s + p.amount, 0);
                const startDate = loan.startDate?.toDate ? loan.startDate.toDate() : new Date(loan.startDate);
                const resultado = calcularSaldo(loan.principalAmount, loan.dailyInterestRate, startDate, paymentsList, hoje);
                saldoHoje = typeof resultado === 'object' ? resultado.saldoDevedor : resultado;
            }
            
            const startDate = loan.startDate?.toDate ? loan.startDate.toDate() : new Date(loan.startDate);
            
            dados.push({
                'Cliente': loan.clientName || '-',
                'Valor Original': loan.principalAmount,
                'Taxa Diária (%)': (loan.dailyInterestRate * 100).toFixed(2),
                'Data Início': formatarData(startDate),
                'Dias Corridos': diasEntre(startDate, hoje),
                'Total Pago': totalPago,
                'Saldo Devedor Hoje': saldoHoje,
                'Status': loan.status === 'active' ? 'Ativo' : 'Quitado',
                'Observações': loan.notes || ''
            });
        }
        
        const ws = XLSX.utils.json_to_sheet(dados);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Empréstimos');
        
        // Auto-width das colunas
        const colWidths = Object.keys(dados[0] || {}).map(key => ({ wch: Math.max(key.length + 2, 15) }));
        ws['!cols'] = colWidths;
        
        XLSX.writeFile(wb, `cerraloan_emprestimos_${hoje.toISOString().split('T')[0]}.xlsx`);
        
        if(window.hideLoading) hideLoading();
        if(window.showToast) showToast('Excel exportado!', 'success');
        
    } catch(error) {
        if(window.hideLoading) hideLoading();
        console.error('Erro ao exportar Excel:', error);
        if(window.showToast) showToast('Erro ao exportar', 'error');
    }
}

// --- RECIBO PARA CLIENTE BAIXAR ---
function gerarComprovanteCliente(loan, payments, saldoHoje, clientData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const startDate = loan.startDate instanceof Date ? loan.startDate : 
        (loan.startDate?.toDate ? loan.startDate.toDate() : new Date(loan.startDate));
    const totalPago = payments.reduce((s, p) => s + p.amount, 0);
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CerraLoan', 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Extrato do Empréstimo', 105, 22, { align: 'center' });
    
    doc.line(20, 27, 190, 27);
    
    let y = 37;
    doc.setFontSize(11);
    
    const addLine = (label, value) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 25, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value), 90, y);
        y += 8;
    };
    
    addLine('Cliente:', clientData.name || '-');
    addLine('CPF:', clientData.cpf || '-');
    y += 3;
    addLine('Valor Emprestado:', formatarMoeda(loan.principalAmount));
    addLine('Taxa Diária:', (loan.dailyInterestRate * 100).toFixed(1) + '%');
    addLine('Data do Empréstimo:', formatarData(startDate));
    addLine('Dias Corridos:', diasEntre(startDate, new Date()) + ' dias');
    y += 3;
    addLine('Total Pago:', formatarMoeda(totalPago));
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    addLine('SALDO DEVEDOR HOJE:', formatarMoeda(saldoHoje));
    
    // Tabela de pagamentos
    if (payments.length > 0) {
        y += 5;
        doc.setFontSize(12);
        doc.text('Histórico de Pagamentos:', 25, y);
        y += 5;
        
        const tableData = payments.map(p => [
            formatarData(p.date instanceof Date ? p.date : new Date(p.date)),
            formatarMoeda(p.amount),
            p.type === 'full' ? 'Quitação' : 'Parcial'
        ]);
        
        doc.autoTable({
            startY: y,
            head: [['Data', 'Valor', 'Tipo']],
            body: tableData,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [22, 33, 62] }
        });
    }
    
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text('Gerado em: ' + formatarData(new Date()) + ' - CerraLoan', 105, 285, { align: 'center' });
    
    doc.save(`extrato_${clientData.name?.replace(/\s/g, '_') || 'cliente'}_${Date.now()}.pdf`);
}
