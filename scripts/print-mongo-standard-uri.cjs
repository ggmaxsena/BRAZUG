"use strict";

/**
 * Rode localmente (onde mongodb+srv funciona):
 *   node scripts/print-mongo-standard-uri.cjs
 * Copie a linha MONGODB_URI_STANDARD= para o painel Hostinger.
 */

try {
  require("dotenv").config();
} catch (e) {
  /* opcional */
}

const dns = require("dns");
const dnsPromises = dns.promises;

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const srvUri =
  process.env.MONGODB_URI ||
  process.argv[2];

if (!srvUri || !srvUri.startsWith("mongodb+srv://")) {
  console.error(
    "Uso: MONGODB_URI='mongodb+srv://...' node scripts/print-mongo-standard-uri.cjs"
  );
  process.exit(1);
}

const match = srvUri.match(
  /^mongodb\+srv:\/\/([^/]+)(\/[^?]*)?(\?.*)?$/
);
const authority = match[1];
const at = authority.lastIndexOf("@");
const hostname = authority.slice(at + 1);
const dbPath = match[2] || "";
const query = (match[3] || "").replace(/^\?/, "");

async function main() {
  const srvName = "_mongodb._tcp." + hostname;
  const srvRecords = await dnsPromises.resolveSrv(srvName);
  const txtRecords = await dnsPromises.resolveTxt(hostname);

  const hosts = srvRecords
    .map(function (r) {
      return r.name.replace(/\.$/, "") + ":" + r.port;
    })
    .join(",");

  const params = new URLSearchParams();
  txtRecords.forEach(function (rows) {
    rows.forEach(function (part) {
      part.split("&").forEach(function (pair) {
        const eq = pair.indexOf("=");
        if (eq !== -1) {
          params.set(pair.slice(0, eq), pair.slice(eq + 1));
        }
      });
    });
  });
  params.set("ssl", "true");
  new URLSearchParams(query).forEach(function (v, k) {
    params.set(k, v);
  });

  const standard =
    "mongodb://" +
    authority.slice(0, at + 1) +
    hosts +
    dbPath +
    "?" +
    params.toString();

  console.log("\nCole no painel Hostinger (Environment variables):\n");
  console.log("MONGODB_URI_STANDARD=" + standard);
  console.log(
    "\n(Opcional: remova ou deixe MONGODB_URI; STANDARD tem prioridade.)\n"
  );
}

main().catch(function (err) {
  console.error(err.message);
  process.exit(1);
});
