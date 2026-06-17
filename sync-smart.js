/**
 * SMART SYNC - Tenta sincronizar primeiro localmente, depois via servidor remoto.
 * Uso: node sync-smart.js <nome> <realm> [region]
 */

const name = process.argv[2] || 'skazao';
const realm = process.argv[3] || 'doomhowl';
const region = process.argv[4] || 'us';

const LOCAL_URL = 'http://localhost:3000/api/character/sync';
const REMOTE_URL = 'http://2.24.124.162:3001/api/character/sync';

// O endpoint LOCAL (localhost:3000) exige Admin JWT. 
// No entanto, se quisermos apenas testar a conectividade ou usar o proxy do site:
const ADMIN_TOKEN = process.env.ADMIN_TOKEN; 

async function trySync(url, token = null) {
    console.log(`[SYNC] Tentando: ${url} para ${name}-${realm}...`);
    
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ name, realm, region })
        });

        if (!res.ok) {
            let errorBody = "";
            try {
                const data = await res.json();
                errorBody = ` - ${JSON.stringify(data)}`;
            } catch (e) {
                try {
                    errorBody = ` - ${await res.text()}`;
                } catch (e2) {}
            }
            throw new Error(`Falha: Status ${res.status}${errorBody}`);
        }

        return await res.json();
    } catch (err) {
        throw new Error(err.message);
    }
}

async function run() {
    // Se LOCAL_URL e REMOTE_URL forem iguais (ex: configurado no .env), só tenta uma vez
    if (LOCAL_URL === REMOTE_URL) {
        console.log('ℹ️ LOCAL_URL e REMOTE_URL são idênticos. Tentando apenas uma vez...');
        try {
            const data = await trySync(LOCAL_URL, ADMIN_TOKEN);
            console.log('✅ Sucesso:', data);
        } catch (err) {
            console.error('❌ Falha:', err.message);
        }
        return;
    }

    try {
        // 1. Tenta via Website Local
        const data = await trySync(LOCAL_URL, ADMIN_TOKEN);
        console.log('✅ Sucesso via Local:', data);
    } catch (err) {
        console.warn(`⚠️ Local falhou: ${err.message}. Tentando Remoto Direto...`);
        try {
            // 2. Tenta via Armory Backend Remoto diretamente
            const data = await trySync(REMOTE_URL);
            console.log('✅ Sucesso via Remoto:', data);
        } catch (remoteErr) {
            console.error('❌ Falha total:', remoteErr.message);
        }
    }
}

run();
