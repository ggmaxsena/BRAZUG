import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

function logToFile(message: string) {
  const logPath = path.join(process.cwd(), 'sync-debug.log');
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logPath, `[BLIZZARD-LOG] ${timestamp} ${message}\n`);
}

class BlizzardService {
  private clientId: string;
  private clientSecret: string;
  private region: string;
  private locale: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.clientId = (process.env.BLIZZARD_CLIENT_ID || '').replace(/^["']|["']$/g, '');
    this.clientSecret = (process.env.BLIZZARD_CLIENT_SECRET || '').replace(/^["']|["']$/g, '');
    this.region = process.env.BLIZZARD_REGION || 'us';
    this.locale = process.env.BLIZZARD_LOCALE || 'pt_BR';
  }

  private async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await axios.post(
      `https://${this.region}.battle.net/oauth/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    this.accessToken = response.data.access_token;
    this.tokenExpiresAt = Date.now() + response.data.expires_in * 1000;
    return this.accessToken;
  }

  private async fetchFromBlizzard(path: string, namespaceSuffix: string = 'profile') {
    const token = await this.getAccessToken();
    const url = `https://${this.region}.api.blizzard.com${path}`;
    console.log(`[BLIZZARD DEBUG] URL final: ${url}`); // LOG PARA DEBUG
    
    // Lista de namespaces
    const namespaces = [
      process.env.BLIZZARD_NAMESPACE,
      `${namespaceSuffix}-classic1x-${this.region}`,
      `${namespaceSuffix}-classic-${this.region}`,
      `${namespaceSuffix}-${this.region}`
    ].filter(Boolean) as string[];

    let lastError: any = null;

    for (const ns of namespaces) {
      try {
        console.log(`[BLIZZARD DEBUG] Trying namespace: ${ns} for URL: ${url}`);
        const response = await axios.get(url, {
          params: { namespace: ns, locale: this.locale },
          headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
      } catch (error: any) {
        lastError = error;
        console.log(`[BLIZZARD DEBUG] Namespace ${ns} failed with status: ${error.response?.status || 'no-response'}`);
        if (error.response?.status === 404) continue;
        throw error;
      }
    }
    console.error(`[BLIZZARD] All namespaces failed for ${path}`);
    throw lastError;
  }

  async getCharacterProfile(realm: string, characterName: string) {
    // Mantém realm minúsculo, mas preserva casing do nome para evitar erro com acentos
    const path = `/profile/wow/character/${realm.toLowerCase()}/${characterName}`;
    return this.fetchFromBlizzard(path);
  }

  async getCharacterEquipment(realm: string, characterName: string) {
    const path = `/profile/wow/character/${realm.toLowerCase()}/${characterName.toLowerCase()}/equipment`;
    return this.fetchFromBlizzard(path);
  }

  async getCharacterMedia(realm: string, characterName: string) {
    const path = `/profile/wow/character/${realm.toLowerCase()}/${characterName.toLowerCase()}/character-media`;
    return this.fetchFromBlizzard(path);
  }

  async getCharacterProfessions(realm: string, characterName: string) {
    const path = `/profile/wow/character/${realm.toLowerCase()}/${characterName.toLowerCase()}/professions`;
    return this.fetchFromBlizzard(path);
  }

  async getCharacterStatistics(realm: string, characterName: string) {
    const path = `/profile/wow/character/${realm.toLowerCase()}/${characterName.toLowerCase()}/statistics`;
    return this.fetchFromBlizzard(path);
  }

  async getCharacterSpecializations(realm: string, characterName: string) {
    const path = `/profile/wow/character/${realm.toLowerCase()}/${characterName.toLowerCase()}/specializations`;
    return this.fetchFromBlizzard(path);
  }

  async getCharacterReputations(realm: string, characterName: string) {
    const path = `/profile/wow/character/${realm.toLowerCase()}/${characterName.toLowerCase()}/reputations`;
    return this.fetchFromBlizzard(path);
  }

  async getCharacterAchievements(realm: string, characterName: string) {
    const path = `/profile/wow/character/${realm.toLowerCase()}/${characterName.toLowerCase()}/achievements`;
    return this.fetchFromBlizzard(path);
  }

  async getGuildRoster(realm: string, guildName: string) {
    const path = `/data/wow/guild/${realm.toLowerCase()}/${guildName.toLowerCase()}/roster`;
    return this.fetchFromBlizzard(path, 'data');
  }
}

export const blizzardService = new BlizzardService();
