// notifications.js - CerraLoan
// Notificação local de vencimento para o cliente (Sprint 18 do roadmap).
// Usa a Web Notifications API do próprio navegador (sem servidor/push real por trás -
// isso exigiria backend + Firebase Cloud Messaging na versão com Firebase de verdade).
(function () {
    function todayKey() {
        return new Date().toISOString().slice(0, 10);
    }

    async function checkVencimentoNotification(loans) {
        if (typeof Notification === 'undefined') return;

        const shownKey = 'cerraloan_notif_shown_' + todayKey();
        if (sessionStorage.getItem(shownKey)) return;

        const emAtencao = (loans || []).filter(l => l.status === 'active' && (l.diasCorridos || 0) > 15);
        if (emAtencao.length === 0) return;

        if (Notification.permission === 'default') {
            try { await Notification.requestPermission(); } catch (e) { return; }
        }
        if (Notification.permission !== 'granted') return;

        const loan = emAtencao[0];
        try {
            new Notification('CerraLoan - Empréstimo vencendo', {
                body: `Seu saldo devedor de ${typeof formatarMoeda === 'function' ? formatarMoeda(loan.saldoHoje || 0) : loan.saldoHoje} aumenta todo dia que passa. Quite ou simule uma data para economizar nos juros.`,
                tag: 'cerraloan-vencimento'
            });
            sessionStorage.setItem(shownKey, '1');
        } catch (e) {
            // Notification pode falhar silenciosamente em contextos sem permissao real (ex: iframe)
        }
    }

    window.checkVencimentoNotification = checkVencimentoNotification;
})();
