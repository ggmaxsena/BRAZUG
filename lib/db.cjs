"use strict";

// Delay requiring and creating PrismaClient until after env is loaded and initDb is called.
let prisma = null;
let initPromise = null;

async function initDb() {
  if (initPromise) return initPromise;

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "Missing DATABASE_URL environment variable. Call loadEnv() before using the database or set DATABASE_URL in the environment."
    );
  }

  // Require the generated Prisma client at runtime. This avoids loading the engine
  // during module import time and gives a clearer error if the client wasn't generated.
  const { PrismaClient } = require("@prisma/client");
  prisma = new PrismaClient();
  initPromise = Promise.resolve(prisma);
  return initPromise;
}

async function listAdventures(publishedOnly) {
  await initDb();
  return prisma.adventure.findMany({
    where: publishedOnly ? { published: true } : undefined,
    orderBy: [{ event_date: "desc" }, { id: "desc" }],
  });
}

async function getAdventure(id) {
  await initDb();
  return prisma.adventure.findUnique({
    where: { id: Number(id) },
  });
}

async function createAdventure(data) {
  await initDb();
  const payload = {
    title: data.title || "",
    body: data.body || "",
    author: data.author || "",
    image_url: data.image_url || "",
    event_date: data.event_date || new Date().toISOString().slice(0, 10),
    published: data.published !== false,
  };
  return prisma.adventure.create({ data: payload });
}

async function updateAdventure(id, data) {
  const existing = await getAdventure(id);
  if (!existing) return null;

  await initDb();
  const payload = {
    title: data.title !== undefined ? data.title : existing.title,
    body: data.body !== undefined ? data.body : existing.body,
    author: data.author !== undefined ? data.author : existing.author,
    image_url: data.image_url !== undefined ? data.image_url : existing.image_url,
    event_date: data.event_date !== undefined ? data.event_date : existing.event_date,
    published: data.published !== undefined ? data.published : existing.published,
  };

  return prisma.adventure.update({
    where: { id: Number(id) },
    data: payload,
  });
}

async function deleteAdventure(id) {
  await initDb();
  await prisma.adventure.delete({ where: { id: Number(id) } });
  return true;
}

module.exports = {
  initDb,
  listAdventures,
  getAdventure,
  createAdventure,
  updateAdventure,
  deleteAdventure,
};
