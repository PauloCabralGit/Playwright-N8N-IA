import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const targetPath = path.join(
  process.cwd(),
  "node_modules",
  "@opennextjs",
  "cloudflare",
  "dist",
  "cli",
  "build",
  "bundle-server.js"
);

const marker = '"./middleware/handler.mjs",';
const injection = `${marker}\n            "cloudflare:sockets",`;

async function patchBundleServer() {
  const source = await readFile(targetPath, "utf8");

  if (source.includes('"cloudflare:sockets"')) {
    console.log("[postinstall] OpenNext Cloudflare already patched for cloudflare:sockets.");
    return;
  }

  if (!source.includes(marker)) {
    throw new Error(
      `[postinstall] Could not find insertion marker in ${targetPath}.`
    );
  }

  const patched = source.replace(marker, injection);
  await writeFile(targetPath, patched, "utf8");
  console.log("[postinstall] Patched OpenNext Cloudflare bundle-server externals.");
}

patchBundleServer().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
