"use strict";

/*
 * Dados públicos da guilda no World of Warcraft: Forever via Battle.net API.
 *
 * Forever não usa realm: as guildas são consultadas pelo slug direto no
 * namespace profile-forever-{region}.
 */

const GUILD_SLUGS = ["brazug", "brazug-ii"];
const CACHE_TTL_MS = 5 * 60 * 1000;
const FAILURE_RETRY_MS = 60 * 1000;
const TOKEN_SAFETY_MS = 60 * 1000;

const CLASS_NAMES = {
  1: "Guerreiro",
  2: "Paladino",
  3: "Caçador",
  4: "Ladino",
  5: "Sacerdote",
  6: "Cavaleiro da Morte",
  7: "Xamã",
  8: "Mago",
  9: "Bruxo",
  11: "Druida"
};

const RACE_NAMES = {
  1: "Humano",
  2: "Orc",
  3: "Anão",
  4: "Elfo Noturno",
  5: "Morto-vivo",
  6: "Tauren",
  7: "Gnomo",
  8: "Troll",
  10: "Elfo Sanguinário",
  11: "Draenei",
  95: "Skyborne da Alta Ordem",
  96: "Skyborne Molda-ventos"
};

let token = null;
let tokenExpiresAt = 0;
let cache = null;
let cacheExpiresAt = 0;
let lastError = null;
let failureExpiresAt = 0;
let inFlight = null;

function getRegion() {
  return String(process.env.BLIZZARD_REGION || "us").toLowerCase();
}

function getLocale() {
  return process.env.BLIZZARD_LOCALE || "pt_BR";
}

async function getAccessToken() {
  const now = Date.now();
  if (token && now < tokenExpiresAt - TOKEN_SAFETY_MS) return token;

  const region = getRegion();
  const clientId = process.env.BLIZZARD_CLIENT_ID;
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Configure BLIZZARD_CLIENT_ID e BLIZZARD_CLIENT_SECRET");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`https://${region}.battle.net/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15000)
  });

  if (!res.ok) throw new Error(`Falha ao obter token Blizzard (${res.status})`);

  const data = await res.json();
  token = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  return token;
}

async function fetchJson(url) {
  const accessToken = await getAccessToken();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(20000)
  });

  if (!res.ok) {
    const err = new Error(`Blizzard API ${res.status}: ${url}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

function buildGuildData(profile, roster) {
  const members = Array.isArray(roster.members) ? roster.members : [];
  const levels = members.map((m) => Number(m.character?.level) || 0);
  const totalLevels = levels.reduce((sum, level) => sum + level, 0);

  const classCounts = {};
  const raceCounts = {};

  for (const member of members) {
    const classId = member.character?.playable_class?.id;
    const raceId = member.character?.playable_race?.id;
    const className = CLASS_NAMES[classId] || `Classe ${classId}`;
    const raceName = RACE_NAMES[raceId] || `Raça ${raceId}`;
    classCounts[className] = (classCounts[className] || 0) + 1;
    raceCounts[raceName] = (raceCounts[raceName] || 0) + 1;
  }

  return {
    slug: profile.slug || "",
    id: profile.id,
    name: profile.name,
    faction: profile.faction?.name || "",
    members: Number(profile.member_count) || members.length,
    createdAt: profile.created_timestamp || null,
    ruleset: profile.ruleset
      ? { id: profile.ruleset.id, name: profile.ruleset.name }
      : null,
    maxLevel: levels.length ? Math.max(...levels) : 0,
    avgLevel: levels.length ? Number((totalLevels / levels.length).toFixed(1)) : 0,
    classCounts,
    raceCounts
  };
}

async function fetchGuild(slug) {
  const region = getRegion();
  const namespace = `profile-forever-${region}`;
  const base = `https://${region}.api.blizzard.com/data/wow/guild/${encodeURIComponent(slug)}`;
  const query = `?namespace=${namespace}&locale=${encodeURIComponent(getLocale())}`;

  const [profile, roster] = await Promise.all([
    fetchJson(`${base}${query}`),
    fetchJson(`${base}/roster${query}`)
  ]);

  return buildGuildData(profile, roster);
}

async function fetchAllGuilds() {
  const results = await Promise.allSettled(GUILD_SLUGS.map((slug) => fetchGuild(slug)));

  const guilds = [];
  const errors = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      guilds.push(result.value);
    } else {
      errors.push({ slug: GUILD_SLUGS[index], error: result.reason?.message || "Erro desconhecido" });
    }
  });

  if (!guilds.length) {
    throw new Error(errors.map((e) => `${e.slug}: ${e.error}`).join(" | "));
  }

  const totalMembers = guilds.reduce((sum, guild) => sum + guild.members, 0);
  const weightedLevels = guilds.reduce((sum, guild) => sum + guild.avgLevel * guild.members, 0);
  const maxLevel = guilds.reduce((max, guild) => Math.max(max, guild.maxLevel), 0);

  return {
    updatedAt: Date.now(),
    guilds,
    totals: {
      guilds: guilds.length,
      members: totalMembers,
      maxLevel,
      avgLevel: totalMembers ? Number((weightedLevels / totalMembers).toFixed(1)) : 0
    },
    errors: errors.length ? errors : undefined
  };
}

async function getForeverGuilds() {
  const now = Date.now();
  if (cache && now < cacheExpiresAt) return cache;
  if (inFlight) return inFlight;
  if (lastError && now < failureExpiresAt) {
    if (cache) return { ...cache, stale: true };
    throw lastError;
  }

  inFlight = (async () => {
    try {
      const data = await fetchAllGuilds();
      cache = data;
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      lastError = null;
      failureExpiresAt = 0;
      return data;
    } catch (e) {
      lastError = e;
      failureExpiresAt = Date.now() + FAILURE_RETRY_MS;
      // Em caso de falha temporária, mantém o último dado bom.
      if (cache) return { ...cache, stale: true };
      throw e;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

function clearCache() {
  cache = null;
  cacheExpiresAt = 0;
  lastError = null;
  failureExpiresAt = 0;
  token = null;
  tokenExpiresAt = 0;
}

module.exports = {
  CACHE_TTL_MS,
  getForeverGuilds,
  clearCache
};
