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
    function seedIfEmpty() {
        if (Object.keys(authUsers).length > 0) return;

        const now = new Date();
        const adminUid = 'admin-demo';
        const clientUid = 'cliente-demo';

        authUsers['admin@admin.com'] = { email: 'admin@admin.com', password: 'admin123', uid: adminUid };
        authUsers['cliente@cliente.com'] = { email: 'cliente@cliente.com', password: 'cliente123', uid: clientUid };
        saveAuthUsers();

        store.collections.users = {
            [adminUid]: { name: 'Administrador', email: 'admin@admin.com', role: 'admin', createdAt: makeTimestamp(now) },
            [clientUid]: {
                name: 'Cliente Teste', email: 'cliente@cliente.com', cpf: '123.456.789-00',
                phone: '11999999999', role: 'client', createdAt: makeTimestamp(now)
            }
        };

        store.collections.settings = {
            general: { companyName: 'CerraLoan', companyPhone: '62999999999', defaultDailyRate: 0.005 }
        };

        const loanId = genId('loan');
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 25);

        store.collections.loans = {
            [loanId]: {
                clientId: clientUid, clientName: 'Cliente Teste', principalAmount: 1000,
                dailyInterestRate: 0.005, startDate: startDate.toISOString(), status: 'active',
                notes: 'Empréstimo de demonstração', createdBy: adminUid, createdAt: makeTimestamp(startDate)
            }
        };

        const paymentId = genId('pay');
        const paymentDate = new Date(now);
        paymentDate.setDate(paymentDate.getDate() - 10);

        store.collections['loans/' + loanId + '/payments'] = {
            [paymentId]: { amount: 300, date: paymentDate.toISOString(), type: 'partial', registeredBy: adminUid, createdAt: makeTimestamp(paymentDate) }
        };

        saveStore();
        console.log('%c[CerraLoan] Modo offline: dados de demonstração criados.', 'color:#16a34a');
        console.log('[CerraLoan] Login admin: admin@admin.com / admin123');
        console.log('[CerraLoan] Login cliente: cliente@cliente.com / cliente123');
    }
    seedIfEmpty();

    console.log('%c[CerraLoan] Executando 100% offline (sem backend Firebase real). Dados salvos no localStorage deste navegador.', 'color:#f59e0b');
})();
