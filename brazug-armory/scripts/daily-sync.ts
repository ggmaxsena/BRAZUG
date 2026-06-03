import { syncService } from '../src/services/sync.service';
import 'dotenv/config';

/**
 * Script de sincronização diária da guilda BRAZUG.
 * Este script deve ser executado via cron ou scheduler (ex: PM2 cron).
 */
async function runDailySync() {
    console.log('--- [INICIANDO SINCRONIZAÇÃO DIÁRIA DA GUILDA] ---');
    console.log(`Data: ${new Date().toISOString()}`);
    
    const REALM = 'doomhowl';
    const GUILD = 'BRAZUG';
    const REGION = 'us';

    try {
        const result = await syncService.syncGuildRoster(REALM, GUILD, REGION);
        
        console.log('\n--- [RESUMO DA SINCRONIZAÇÃO] ---');
        console.log(`Total de membros encontrados: ${result.total}`);
        console.log(`Sincronizados com sucesso: ${result.success}`);
        console.log(`Falhas: ${result.failed}`);
        console.log('--- [FIM DO PROCESSO] ---');
        
        process.exit(0);
    } catch (error: any) {
        console.error('\n--- [ERRO FATAL NA SINCRONIZAÇÃO] ---');
        console.error(error.message);
        process.exit(1);
    }
}

// Executa o script
runDailySync();
