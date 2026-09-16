// offline-firebase.js - CerraLoan
// Backend local (100% offline) que imita a API do Firebase (compat) usada pelo app:
// firebase.initializeApp / firebase.auth() / firebase.firestore() / FieldValue.serverTimestamp()
// Os dados ficam salvos no localStorage do navegador. Quando o projeto Firebase real
// (gestor.renatorosa@gmail.com) estiver pronto, basta remover este arquivo e voltar
// a carregar os SDKs oficiais do Firebase no index.html.
(function () {
    const STORAGE_KEY = 'cerraloan_offline_store';
    const AUTH_KEY = 'cerraloan_offline_auth_users';
    const SESSION_KEY = 'cerraloan_offline_session';

    function loadJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }
    function saveStore() { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
    function saveAuthUsers() { localStorage.setItem(AUTH_KEY, JSON.stringify(authUsers)); }

    const store = loadJSON(STORAGE_KEY, { collections: {} });
    store.collections = store.collections || {};
    const authUsers = loadJSON(AUTH_KEY, {});

    function genId(prefix) {
        return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }

    // ---------------- Timestamp (imita firebase.firestore.Timestamp) ----------------
    function makeTimestamp(date) {
        const ms = date.getTime();
        return {
            __ts: true,
            seconds: Math.floor(ms / 1000),
            nanoseconds: (ms % 1000) * 1e6,
            toDate() { return new Date(this.seconds * 1000 + this.nanoseconds / 1e6); },
            toMillis() { return this.seconds * 1000 + Math.round(this.nanoseconds / 1e6); }
        };
    }
    const SERVER_TIMESTAMP = { __serverTimestamp: true };

    function reviveValue(v) {
        if (v && typeof v === 'object' && v.__ts) {
            return makeTimestamp(new Date(v.seconds * 1000 + v.nanoseconds / 1e6));
        }
        return v;
    }
    function reviveData(raw) {
        const out = {};
        for (const k in raw) out[k] = reviveValue(raw[k]);
        return out;
    }
    function resolveWrite(data) {
        const out = {};
        for (const k in data) {
            out[k] = data[k] === SERVER_TIMESTAMP ? makeTimestamp(new Date()) : data[k];
        }
        return out;
    }
    function sortableValue(v) {
        if (v && v.__ts) return v.seconds * 1000 + v.nanoseconds / 1e6;
        return v;
    }

    // ---------------- Firestore (mock) ----------------
    function matchesWheres(raw, wheres) {
        return wheres.every(([field, op, value]) => {
            const v = raw[field];
            switch (op) {
                case '==': return v === value;
                case '!=': return v !== value;
                case '<': return v < value;
                case '<=': return v <= value;
                case '>': return v > value;
                case '>=': return v >= value;
                default: return true;
            }
        });
    }

    function queryRef(path, wheres, orders, limitN) {
        wheres = wheres || [];
        orders = orders || [];
        return {
            where(field, op, value) { return queryRef(path, wheres.concat([[field, op, value]]), orders, limitN); },
            orderBy(field, dir) { return queryRef(path, wheres, orders.concat([[field, dir || 'asc']]), limitN); },
            limit(n) { return queryRef(path, wheres, orders, n); },
            async get() {
                const col = store.collections[path] || {};
                let entries = Object.keys(col).map(id => ({ id, raw: col[id] }));
                entries = entries.filter(e => matchesWheres(e.raw, wheres));
                orders.forEach(([field, dir]) => {
                    entries.sort((a, b) => {
                        const va = sortableValue(a.raw[field]);
                        const vb = sortableValue(b.raw[field]);
                        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
                        return dir === 'desc' ? -cmp : cmp;
                    });
                });
                if (limitN) entries = entries.slice(0, limitN);
                const docs = entries.map(e => ({
                    id: e.id,
                    exists: true,
                    data() { return reviveData(e.raw); }
                }));
                return {
                    docs,
                    size: docs.length,
                    empty: docs.length === 0,
                    forEach(fn) { docs.forEach(fn); }
                };
            }
        };
    }

    function docRef(path, id) {
        const fullPath = path + '/' + id;
        return {
            id,
            path: fullPath,
            async get() {
                const raw = (store.collections[path] || {})[id];
                return {
                    id,
                    exists: !!raw,
                    data() { return raw ? reviveData(raw) : undefined; }
                };
            },
            async set(data, opts) {
                store.collections[path] = store.collections[path] || {};
                const resolved = resolveWrite(data);
                const existing = store.collections[path][id];
                store.collections[path][id] = (opts && opts.merge && existing)
                    ? Object.assign({}, existing, resolved)
                    : resolved;
                saveStore();
            },
            async update(data) {
                store.collections[path] = store.collections[path] || {};
                if (!store.collections[path][id]) throw new Error('No document to update: ' + fullPath);
                store.collections[path][id] = Object.assign({}, store.collections[path][id], resolveWrite(data));
                saveStore();
            },
            async delete() {
                if (store.collections[path]) delete store.collections[path][id];
                saveStore();
            },
            collection(sub) { return collectionRef(fullPath + '/' + sub); }
        };
    }

    function collectionRef(path) {
        return {
            doc(id) { return docRef(path, id || genId('doc')); },
            async add(data) {
                const id = genId('doc');
                await docRef(path, id).set(data);
                return { id };
            },
            where(field, op, value) { return queryRef(path, [[field, op, value]]); },
            orderBy(field, dir) { return queryRef(path, [], [[field, dir || 'asc']]); },
            limit(n) { return queryRef(path, [], [], n); },
            async get() { return queryRef(path, []).get(); }
        };
    }

    const sharedFirestore = { collection(name) { return collectionRef(name); } };

    // ---------------- Auth (mock) ----------------
    function createAuthInstance(isDefault) {
        let currentUser = null;
        let listeners = [];

        function makeUserObject(email, theUid) {
            return {
                uid: theUid,
                email,
                async signOut() { return instance.signOut(); },
                async reauthenticateWithCredential(credential) {
                    const rec = authUsers[email];
                    if (!rec || rec.password !== credential.password) {
                        const err = new Error('Senha incorreta');
                        err.code = 'auth/wrong-password';
                        throw err;
                    }
                },
                async updatePassword(newPassword) {
                    authUsers[email].password = newPassword;
                    saveAuthUsers();
                }
            };
        }

        function notify() { listeners.forEach(cb => cb(currentUser)); }

        if (isDefault) {
            const savedUid = localStorage.getItem(SESSION_KEY);
            if (savedUid) {
                const found = Object.values(authUsers).find(u => u.uid === savedUid);
                if (found) currentUser = makeUserObject(found.email, found.uid);
            }
        }

        const instance = {
            get currentUser() { return currentUser; },
            async signInWithEmailAndPassword(email, password) {
                const key = (email || '').toLowerCase();
                const rec = authUsers[key];
                if (!rec) {
                    const err = new Error('Usuário não encontrado');
                    err.code = 'auth/user-not-found';
                    throw err;
                }
                if (rec.password !== password) {
                    const err = new Error('Senha incorreta');
                    err.code = 'auth/wrong-password';
                    throw err;
                }
                currentUser = makeUserObject(key, rec.uid);
                if (isDefault) localStorage.setItem(SESSION_KEY, rec.uid);
                notify();
                return { user: currentUser };
            },
            async createUserWithEmailAndPassword(email, password) {
                const key = (email || '').toLowerCase();
                if (authUsers[key]) {
                    const err = new Error('Este email já está em uso');
                    err.code = 'auth/email-already-in-use';
                    throw err;
                }
                const newUid = genId('user');
                authUsers[key] = { email: key, password, uid: newUid };
                saveAuthUsers();
                currentUser = makeUserObject(key, newUid);
                if (isDefault) localStorage.setItem(SESSION_KEY, newUid);
                notify();
                return { user: currentUser };
            },
            async signOut() {
                currentUser = null;
                if (isDefault) localStorage.removeItem(SESSION_KEY);
                notify();
            },
            onAuthStateChanged(cb) {
                listeners.push(cb);
                Promise.resolve().then(() => cb(currentUser));
                return () => { listeners = listeners.filter(l => l !== cb); };
            }
        };
        return instance;
    }

    // ---------------- App / namespace ----------------
    const apps = {};

    function initializeApp(config, name) {
        const appName = name || '[DEFAULT]';
        const isDefault = appName === '[DEFAULT]';
        const authInst = createAuthInstance(isDefault);
        const app = {
            name: appName,
            auth() { return authInst; },
            firestore() { return sharedFirestore; },
            async delete() { delete apps[appName]; }
        };
        apps[appName] = app;
        return app;
    }

    function authNamespace() {
        if (!apps['[DEFAULT]']) initializeApp({});
        return apps['[DEFAULT]'].auth();
    }
    authNamespace.EmailAuthProvider = {
        credential(email, password) { return { email: (email || '').toLowerCase(), password }; }
    };

    function firestoreNamespace() { return sharedFirestore; }
    firestoreNamespace.FieldValue = { serverTimestamp() { return SERVER_TIMESTAMP; } };

    window.firebase = {
        initializeApp,
        auth: authNamespace,
        firestore: firestoreNamespace
    };

    // ---------------- Seed inicial (dados de demonstração) ----------------
    function daysAgo(now, n) {
        const d = new Date(now);
        d.setDate(d.getDate() - n);
        return d;
    }

    // Garante um usuario de auth (por uid fixo) sem sobrescrever quem ja existe.
    function ensureAuthUser(email, password, uid) {
        if (authUsers[email]) return false;
        authUsers[email] = { email, password, uid };
        return true;
    }

    // Garante um documento (por id fixo) numa colecao, sem sobrescrever o que ja existe.
    function ensureDoc(path, id, data) {
        store.collections[path] = store.collections[path] || {};
        if (store.collections[path][id]) return false;
        store.collections[path][id] = data;
        return true;
    }

    // Evita duplicar o emprestimo-base de um cliente que ja tinha dados de uma versao
    // anterior do seed (com IDs aleatorios, antes de existirem IDs fixos).
    function clientHasAnyLoan(clientId) {
        const loans = store.collections.loans || {};
        return Object.values(loans).some(l => l.clientId === clientId);
    }

    function ensureDemoData() {
        const now = new Date();
        let changed = false;

        // ---- usuarios ----
        changed = ensureAuthUser('admin@admin.com', 'admin123', 'admin-demo') || changed;
        changed = ensureAuthUser('cliente@cliente.com', 'cliente123', 'cliente-demo') || changed;
        changed = ensureAuthUser('cliente2@cliente.com', 'cliente123', 'cliente2-demo') || changed;
        changed = ensureAuthUser('cliente3@cliente.com', 'cliente123', 'cliente3-demo') || changed;
        changed = ensureAuthUser('cliente4@cliente.com', 'cliente123', 'cliente4-demo') || changed;
        changed = ensureAuthUser('cliente5@cliente.com', 'cliente123', 'cliente5-demo') || changed;
        changed = ensureAuthUser('vendedor@vendedor.com', 'vendedor123', 'vendedor-demo') || changed;
        changed = ensureAuthUser('operador@admin.com', 'operador123', 'operador-demo') || changed;
        saveAuthUsers();

        changed = ensureDoc('users', 'admin-demo', {
            name: 'Administrador', email: 'admin@admin.com', role: 'admin', createdAt: makeTimestamp(now)
        }) || changed;
        changed = ensureDoc('users', 'cliente-demo', {
            name: 'Cliente Teste', email: 'cliente@cliente.com', cpf: '123.456.789-00',
            phone: '11999999999', role: 'client', createdAt: makeTimestamp(now)
        }) || changed;
        changed = ensureDoc('users', 'cliente2-demo', {
            name: 'Maria Souza', email: 'cliente2@cliente.com', cpf: '987.654.321-00',
            phone: '11988887777', role: 'client', createdAt: makeTimestamp(daysAgo(now, 40))
        }) || changed;
        changed = ensureDoc('users', 'cliente3-demo', {
            name: 'Pedro Almeida', email: 'cliente3@cliente.com', cpf: '456.789.123-00',
            phone: '11977776655', role: 'client', createdAt: makeTimestamp(daysAgo(now, 60))
        }) || changed;
        changed = ensureDoc('users', 'cliente4-demo', {
            name: 'Ana Costa', email: 'cliente4@cliente.com', cpf: '654.321.987-00',
            phone: '11966554433', role: 'client', createdAt: makeTimestamp(daysAgo(now, 90))
        }) || changed;
        changed = ensureDoc('users', 'cliente5-demo', {
            name: 'Lucas Ferreira', email: 'cliente5@cliente.com', cpf: '789.123.456-00',
            phone: '11955443322', role: 'client', createdAt: makeTimestamp(daysAgo(now, 70))
        }) || changed;
        changed = ensureDoc('users', 'vendedor-demo', {
            name: 'Vendedor Demo', email: 'vendedor@vendedor.com', role: 'vendedor', createdAt: makeTimestamp(daysAgo(now, 15))
        }) || changed;
        changed = ensureDoc('users', 'operador-demo', {
            name: 'Operador Demo', email: 'operador@admin.com', role: 'operador', createdAt: makeTimestamp(daysAgo(now, 10))
        }) || changed;

        changed = ensureDoc('settings', 'general', {
            companyName: 'CerraLoan', companyPhone: '62999999999', defaultDailyRate: 0.005,
            reminderRuleDays: 5, commissionRate: 0.03
        }) || changed;

        // ---- Cliente 1 (Cliente Teste): 1 emprestimo ativo, 1 pagamento parcial ----
        // (so cria se o cliente ainda nao tiver nenhum emprestimo, para nao duplicar
        // quem ja veio de uma versao anterior do seed com IDs aleatorios)
        if (!clientHasAnyLoan('cliente-demo')) {
            changed = ensureDoc('loans', 'loan-demo-1', {
                clientId: 'cliente-demo', clientName: 'Cliente Teste', principalAmount: 1000,
                dailyInterestRate: 0.005, startDate: daysAgo(now, 25).toISOString(), status: 'active',
                notes: 'Empréstimo de demonstração', createdBy: 'admin-demo', createdAt: makeTimestamp(daysAgo(now, 25))
            }) || changed;
            changed = ensureDoc('loans/loan-demo-1/payments', 'pay-demo-1a', {
                amount: 300, date: daysAgo(now, 10).toISOString(), type: 'partial',
                registeredBy: 'admin-demo', createdAt: makeTimestamp(daysAgo(now, 10))
            }) || changed;
        }

        // ---- Cliente 2 (Maria Souza): 1 quitado + 1 ativo em atraso (sem pagamentos) ----
        changed = ensureDoc('loans', 'loan-demo-2', {
            clientId: 'cliente2-demo', clientName: 'Maria Souza', principalAmount: 500,
            dailyInterestRate: 0.005, startDate: daysAgo(now, 45).toISOString(), status: 'paid',
            notes: 'Empréstimo já quitado', createdBy: 'admin-demo', createdAt: makeTimestamp(daysAgo(now, 45))
        }) || changed;
        changed = ensureDoc('loans/loan-demo-2/payments', 'pay-demo-2a', {
            amount: Math.round(500 * (1 + 0.005 * 43) * 100) / 100, date: daysAgo(now, 2).toISOString(), type: 'full',
            registeredBy: 'admin-demo', createdAt: makeTimestamp(daysAgo(now, 2))
        }) || changed;
        changed = ensureDoc('loans', 'loan-demo-3', {
            clientId: 'cliente2-demo', clientName: 'Maria Souza', principalAmount: 800,
            dailyInterestRate: 0.006, startDate: daysAgo(now, 35).toISOString(), status: 'active',
            notes: 'Empréstimo em atraso (sem pagamentos)', createdBy: 'admin-demo', createdAt: makeTimestamp(daysAgo(now, 35))
        }) || changed;

        // ---- Cliente 3 (Pedro Almeida): emprestimo saudavel, 3 pagamentos parciais ----
        changed = ensureDoc('loans', 'loan-demo-4', {
            clientId: 'cliente3-demo', clientName: 'Pedro Almeida', principalAmount: 2000,
            dailyInterestRate: 0.004, startDate: daysAgo(now, 60).toISOString(), status: 'active',
            notes: 'Cliente pontual, pagamentos frequentes', createdBy: 'admin-demo', createdAt: makeTimestamp(daysAgo(now, 60))
        }) || changed;
        changed = ensureDoc('loans/loan-demo-4/payments', 'pay-demo-4a', {
            amount: 500, date: daysAgo(now, 45).toISOString(), type: 'partial', registeredBy: 'admin-demo', createdAt: makeTimestamp(daysAgo(now, 45))
        }) || changed;
        changed = ensureDoc('loans/loan-demo-4/payments', 'pay-demo-4b', {
            amount: 500, date: daysAgo(now, 30).toISOString(), type: 'partial', registeredBy: 'admin-demo', createdAt: makeTimestamp(daysAgo(now, 30))
        }) || changed;
        changed = ensureDoc('loans/loan-demo-4/payments', 'pay-demo-4c', {
            amount: 400, date: daysAgo(now, 12).toISOString(), type: 'partial', registeredBy: 'admin-demo', createdAt: makeTimestamp(daysAgo(now, 12))
        }) || changed;

        // ---- Cliente 4 (Ana Costa): emprestimo critico, +90 dias sem pagamento ----
        changed = ensureDoc('loans', 'loan-demo-5', {
            clientId: 'cliente4-demo', clientName: 'Ana Costa', principalAmount: 1500,
            dailyInterestRate: 0.007, startDate: daysAgo(now, 90).toISOString(), status: 'active',
            notes: 'Cliente sumiu, sem contato há meses', createdBy: 'admin-demo', createdAt: makeTimestamp(daysAgo(now, 90))
        }) || changed;

        // ---- Cliente 5 (Lucas Ferreira): 1 quitado rapido + 1 novo em dia (recem-criado) ----
        changed = ensureDoc('loans', 'loan-demo-6', {
            clientId: 'cliente5-demo', clientName: 'Lucas Ferreira', principalAmount: 300,
            dailyInterestRate: 0.005, startDate: daysAgo(now, 20).toISOString(), status: 'paid',
            notes: '', createdBy: 'admin-demo', createdAt: makeTimestamp(daysAgo(now, 20))
        }) || changed;
        changed = ensureDoc('loans/loan-demo-6/payments', 'pay-demo-6a', {
            amount: Math.round(300 * (1 + 0.005 * 18) * 100) / 100, date: daysAgo(now, 2).toISOString(), type: 'full',
            registeredBy: 'admin-demo', createdAt: makeTimestamp(daysAgo(now, 2))
        }) || changed;
        changed = ensureDoc('loans', 'loan-demo-7', {
            clientId: 'cliente5-demo', clientName: 'Lucas Ferreira', principalAmount: 1200,
            dailyInterestRate: 0.005, startDate: daysAgo(now, 4).toISOString(), status: 'active',
            notes: 'Empréstimo novo, ainda em dia', createdBy: 'admin-demo', createdAt: makeTimestamp(daysAgo(now, 4))
        }) || changed;

        // ---- Propostas de credito enviadas pelo vendedor para o gestor aprovar ----
        changed = ensureDoc('proposals', 'prop-demo-1', {
            clientName: 'Carlos Prospect', clientCpf: '111.222.333-44', clientPhone: '11977776666',
            principalAmount: 1200, dailyInterestRate: 0.006, notes: 'Cliente indicado por Maria Souza',
            status: 'pending', vendedorId: 'vendedor-demo', vendedorName: 'Vendedor Demo',
            createdAt: makeTimestamp(daysAgo(now, 1))
        }) || changed;
        changed = ensureDoc('proposals', 'prop-demo-2', {
            clientName: 'Fernanda Lima', clientCpf: '222.333.444-55', clientPhone: '11966665555',
            principalAmount: 600, dailyInterestRate: 0.005, notes: '',
            status: 'approved', vendedorId: 'vendedor-demo', vendedorName: 'Vendedor Demo',
            commissionRate: 0.03, commissionAmount: 18,
            createdAt: makeTimestamp(daysAgo(now, 8)), approvedBy: 'admin-demo', approvedAt: makeTimestamp(daysAgo(now, 7))
        }) || changed;
        changed = ensureDoc('proposals', 'prop-demo-3', {
            clientName: 'Roberto Alves', clientCpf: '333.444.555-66', clientPhone: '11955554444',
            principalAmount: 3000, dailyInterestRate: 0.008, notes: 'Valor solicitado muito alto',
            status: 'rejected', rejectReason: 'Score de crédito baixo', vendedorId: 'vendedor-demo', vendedorName: 'Vendedor Demo',
            createdAt: makeTimestamp(daysAgo(now, 12))
        }) || changed;
        changed = ensureDoc('proposals', 'prop-demo-4', {
            clientName: 'Juliana Martins', clientCpf: '444.555.666-77', clientPhone: '11944443333',
            principalAmount: 900, dailyInterestRate: 0.005, notes: 'Primeira vez, sem histórico ainda',
            status: 'pending', vendedorId: 'vendedor-demo', vendedorName: 'Vendedor Demo',
            createdAt: makeTimestamp(daysAgo(now, 0))
        }) || changed;
        changed = ensureDoc('proposals', 'prop-demo-5', {
            clientName: 'Marcos Souza', clientCpf: '555.666.777-88', clientPhone: '11933332222',
            principalAmount: 450, dailyInterestRate: 0.005, notes: '',
            status: 'approved', vendedorId: 'vendedor-demo', vendedorName: 'Vendedor Demo',
            commissionRate: 0.03, commissionAmount: 13.5,
            createdAt: makeTimestamp(daysAgo(now, 20)), approvedBy: 'admin-demo', approvedAt: makeTimestamp(daysAgo(now, 19))
        }) || changed;

        if (changed) {
            saveStore();
            console.log('%c[CerraLoan] Modo offline: dados de demonstração criados/atualizados.', 'color:#16a34a');
            console.log('[CerraLoan] Login admin: admin@admin.com / admin123');
            console.log('[CerraLoan] Login cliente 1: cliente@cliente.com / cliente123');
            console.log('[CerraLoan] Login cliente 2: cliente2@cliente.com / cliente123');
            console.log('[CerraLoan] Login cliente 3: cliente3@cliente.com / cliente123');
            console.log('[CerraLoan] Login cliente 4: cliente4@cliente.com / cliente123');
            console.log('[CerraLoan] Login cliente 5: cliente5@cliente.com / cliente123');
            console.log('[CerraLoan] Login vendedor: vendedor@vendedor.com / vendedor123');
            console.log('[CerraLoan] Login operador: operador@admin.com / operador123');
        }
    }
    ensureDemoData();

    console.log('%c[CerraLoan] Executando 100% offline (sem backend Firebase real). Dados salvos no localStorage deste navegador.', 'color:#f59e0b');
})();
