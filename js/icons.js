// icons.js - CerraLoan
// Sistema de icones SVG (substitui os emojis usados na interface).
// Estilo outline, grade 24x24, usa currentColor para herdar a cor do texto ao redor.
(function () {
    const PATHS = {
        bank: '<path d="M3 21h18"/><path d="M4 21V10"/><path d="M20 21V10"/><path d="M9 21V10"/><path d="M15 21V10"/><path d="M3 10l9-6 9 6"/>',
        home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
        user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
        users: '<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20c0-3.6 2.9-6.4 6.5-6.4S15.5 16.4 15.5 20"/><path d="M15.2 4.6a3 3 0 0 1 0 5.8"/><path d="M18 13.6c2.2.8 3.5 2.9 3.5 6.4"/>',
        wallet: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 10.5h18"/><path d="M16.2 14.5h2.3"/>',
        banknote: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.3"/><path d="M6 9v.01M18 15v.01"/>',
        'log-out': '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/>',
        clipboard: '<rect x="6" y="3.5" width="12" height="17" rx="2"/><path d="M9 3.5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.5"/><path d="M9 10.5h6M9 14.5h6"/>',
        receipt: '<path d="M6 2h12v19l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
        'check-circle': '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.6 2.6L16 9.3"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
        'x-circle': '<circle cx="12" cy="12" r="9"/><path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"/>',
        'alert-triangle': '<path d="M12 3.2l9.5 16.8H2.5z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        'arrow-left': '<path d="M19 12H5"/><path d="M11 18l-6-6 6-6"/>',
        'arrow-right': '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
        settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z"/>',
        'bar-chart': '<path d="M4 20V11M12 20V4M20 20v-8"/>',
        calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 3v4M16 3v4"/>',
        phone: '<path d="M6.6 10.8a12.5 12.5 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.24.9.4 2 .6 3.1.5.5-.05 1 .35 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5c.5 0 .95.4 1 1 -.1 1.1.1 2.2.5 3.1.15.35.06.75-.24 1z"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
        'trending-up': '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
        calculator: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6.5h8"/><path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01"/>',
        shield: '<path d="M12 3l7.5 2.8v5.7c0 4.7-3.3 7.6-7.5 8.5-4.2-.9-7.5-3.8-7.5-8.5V5.8z"/>',
        moon: '<path d="M20 14.7A8.4 8.4 0 1 1 9.3 4a7 7 0 0 0 10.7 10.7z"/>',
        'refresh-cw': '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 3.5V9h-5.5"/>',
        smartphone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
        'message-circle': '<path d="M21 11.5a8.5 8.5 0 1 1-3.9-7.1"/><path d="M21 3l-9.3 8.5-4.9-2"/>',
        'credit-card': '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
        lightbulb: '<path d="M9.5 18h5M10.2 21h3.6"/><path d="M12 3a6 6 0 0 0-3.3 11c.4.3.7.9.7 1.4v.6h5.2v-.6c0-.5.3-1.1.7-1.4A6 6 0 0 0 12 3z"/>',
        'map-pin': '<path d="M12 2a6 6 0 0 0-6 6c0 4.5 6 12 6 12s6-7.5 6-12a6 6 0 0 0-6-6z"/><circle cx="12" cy="8" r="2"/>',
        smile: '<circle cx="12" cy="12" r="9"/><path d="M8 13.5s1.6 2 4 2 4-2 4-2"/><path d="M9 9.5h.01M15 9.5h.01"/>',
        star: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5-4.8-4.6 6.6-.9z"/>',
        handshake: '<path d="M2.5 12.5l3.7-3.2a1.6 1.6 0 0 1 2 0l2.4 2"/><path d="M21.5 12.5l-3.7-3.2a1.6 1.6 0 0 0-2 0L9 15.3a1.4 1.4 0 0 0 1.9 2l.4-.35a1.4 1.4 0 0 0 2 2l.3-.3a1.4 1.4 0 0 0 2 2l1.8-1.8"/><path d="M6.2 9.3L3 12.2v3.4l3 2.7"/><path d="M17.8 9.3L21 12.2"/>',
        'dollar-sign': '<path d="M12 2.5v19"/><path d="M16.5 6.8c0-1.8-2-3.3-4.5-3.3S7.5 5 7.5 6.8s2 2.7 4.5 3.2 4.5 1.4 4.5 3.2-2 3.3-4.5 3.3-4.5-1.5-4.5-3.3"/>',
        'file-text': '<path d="M6 2.5h9l3 3v16H6z"/><path d="M15 2.5V6h3"/><path d="M8.5 12h7M8.5 16h7"/>',
        lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'
    };

    function icon(name, opts) {
        opts = opts || {};
        const size = opts.size || '1em';
        const cls = 'icon' + (opts.class ? ' ' + opts.class : '');
        const body = PATHS[name] || PATHS['alert-triangle'];
        return '<svg class="' + cls + '" width="' + size + '" height="' + size +
            '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
    }

    window.icon = icon;
})();
