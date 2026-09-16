// pix.js - CerraLoan
// Cobrança via Pix (ILUSTRATIVA - Sprint 12 do roadmap).
// Gera um "payload" no formato visual de um BR Code Pix e um QR Code a partir dele,
// só para demonstrar o conceito na apresentação. Não é uma chave Pix real, não deve
// ser usado para receber pagamentos de verdade — para isso, integrar com o PSP/banco.
(function () {
    function pad(str, len) {
        return String(str).length >= len ? String(str) : (String(str) + ' '.repeat(len - String(str).length));
    }

    function gerarPayloadPixFicticio(valor, nomeBeneficiario) {
        const valorStr = Number(valor || 0).toFixed(2);
        const txId = 'DEMO' + Date.now().toString(36).toUpperCase().slice(-10);
        // Estrutura visual de um BR Code (EMV) - ilustrativa, sem CRC valido de verdade.
        return (
            '00020126580014BR.GOV.BCB.PIX' +
            '0136' + txId +
            '52040000' +
            '5303986' +
            '54' + String(valorStr.length).padStart(2, '0') + valorStr +
            '5802BR' +
            '5913' + pad(nomeBeneficiario || 'CerraLoan', 13).slice(0, 13) +
            '6009SAO PAULO' +
            '62070503***' +
            '6304SIMU'
        );
    }

    function abrirPix(valor, nomeBeneficiario, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const payload = gerarPayloadPixFicticio(valor, nomeBeneficiario);
        container.innerHTML =
            '<div style="text-align:center;">' +
            '<div id="pix-qrcode" style="display:inline-block;background:white;padding:8px;border-radius:8px;"></div>' +
            '<p style="font-size:0.75rem;color:var(--danger);margin:8px 0;">Simulação para demonstração — não use para cobrar pagamentos reais.</p>' +
            '<textarea readonly style="width:100%;font-size:0.7rem;padding:8px;border-radius:8px;border:1px solid #ddd;resize:none;" rows="3">' + payload + '</textarea>' +
            '<button class="btn btn-outline btn-block mt-1" id="btn-copy-pix">Copiar Código Pix</button>' +
            '</div>';

        const qrEl = document.getElementById('pix-qrcode');
        if (qrEl && window.QRCode) {
            new QRCode(qrEl, { text: payload, width: 160, height: 160 });
        }

        document.getElementById('btn-copy-pix')?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(payload);
                if (window.showToast) showToast('Código Pix copiado!', 'success');
            } catch (e) {
                if (window.showToast) showToast('Não foi possível copiar', 'error');
            }
        });
    }

    window.gerarPayloadPixFicticio = gerarPayloadPixFicticio;
    window.abrirPix = abrirPix;
})();
