async function forceSync() {
    try {
        const res = await fetch('http://127.0.0.1:3000/api/character/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'skazao', realm: 'doomhowl', region: 'us' })
        });
        const data = await res.json();
        console.log('Sync result:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Fetch error:', e.message);
    }
}

forceSync();
