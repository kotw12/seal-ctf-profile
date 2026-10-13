import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const SOURCE_ROOT = fileURLToPath(new URL("./skills/", import.meta.url));
export const OWNED_SKILL_NAMES = Object.freeze([
  "solve-challenge",
  "seal-problem-workspace",
  "ctf-crypto", "ctf-web", "ctf-pwn", "ctf-reverse", "ctf-forensics",
  "ctf-misc", "ctf-ai-ml", "ctf-malware", "ctf-osint", "ctf-writeup",
  "seal-tool-index", "seal-file-observe", "seal-math-env", "seal-binary-observe",
  "seal-pcap-observe", "seal-qr-decode",
]);
const MARKER_LIMIT = 16 * 1024;

function markerPath(home) {
  return path.join(home, ".seal-owned-skills.json");
}

function readMarker(home) {
  const filename = markerPath(home);
  const info = existing(filename);
  if (!info) return null;
  if (!info.isFile() || info.isSymbolicLink() || info.size > MARKER_LIMIT) {
    throw new Error(`Refusing invalid owned-skill metadata at ${filename}; move it aside explicitly.`);
  }
  let fd;
  try {
    fd = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    const opened = fs.fstatSync(fd);
    if (!opened.isFile() || opened.dev !== info.dev || opened.ino !== info.ino || opened.size > MARKER_LIMIT) throw new Error("metadata changed while opening");
    const data = fs.readFileSync(fd);
    if (data.length > MARKER_LIMIT) throw new Error("metadata exceeds size limit");
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(data));
    if (value?.schemaVersion !== 1 || !value.entries || typeof value.entries !== "object" || Array.isArray(value.entries)
      || Object.keys(value.entries).some(name => !OWNED_SKILL_NAMES.includes(name)
        || typeof value.entries[name]?.source !== "string" || !path.isAbsolute(value.entries[name].source)
        || !/^[a-f0-9]{64}$/.test(value.entries[name].manifestSha256))) throw new Error("unsupported metadata schema");
    return value;
  } catch (error) {
    throw new Error(`Refusing invalid owned-skill metadata at ${filename}: ${error.message}; move it aside explicitly.`, { cause: error });
  } finally { if (fd !== undefined) fs.closeSync(fd); }
}

function manifestHash(filename) {
  return createHash("sha256").update(fs.readFileSync(filename)).digest("hex");
}

function saveMarker(home, previous, definitions) {
  const filename = markerPath(home);
  const entries = Object.fromEntries(definitions.map(item =>
    [path.basename(item.directory), { source: item.directory, manifestSha256: manifestHash(item.manifest) }]));
  const metadata = { schemaVersion: 1, entries };
  if (JSON.stringify(metadata) === JSON.stringify(previous)) return;
  const temporary = path.join(home, `.seal-owned-skills-${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(metadata)}\n`, { flag: "wx", mode: 0o600 });
    if (JSON.stringify(readMarker(home)) !== JSON.stringify(previous)) {
      throw new Error(`Owned-skill metadata changed during registration: ${filename}. Retry without replacing user data.`);
    }
    fs.renameSync(temporary, filename);
  } finally { if (existing(temporary)) fs.unlinkSync(temporary); }
}

function skillRoot(home) {
  if (typeof home !== "string" || !path.isAbsolute(home)) throw new Error("Skill home must be an absolute path.");
  return path.join(home, "skills");
}

function existing(filename) {
  try { return fs.lstatSync(filename); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

function source(name) {
  const directory = fs.realpathSync(path.join(SOURCE_ROOT, name));
  const manifest = path.join(directory, "SKILL.md");
  if (!fs.statSync(manifest).isFile()) throw new Error(`Missing owned skill manifest: ${manifest}`);
  return { directory, manifest };
}

function linkState(destination, expected, marker) {
  const entry = existing(destination);
  if (!entry) return "missing";
  if (!entry.isSymbolicLink()) {
    throw new Error(`Refusing to replace an existing non-owned skill at ${destination}. Preserve or move it explicitly first.`);
  }
  let actual;
  try { actual = fs.realpathSync(destination); }
  catch { throw new Error(`Refusing a broken or unreadable skill link at ${destination}. Preserve or move it explicitly first.`); }
  if (actual === expected) return "current";
  const suffix = path.join("codex", "skills", path.basename(destination));
  const previous = path.join(actual, "SKILL.md");
  const current = path.join(expected, "SKILL.md");
  if (path.isAbsolute(fs.readlinkSync(destination)) && actual.endsWith(`${path.sep}${suffix}`)) {
    const prior = existing(previous);
    const next = existing(current);
    if (prior?.isFile() && !prior.isSymbolicLink() && prior.size <= 128 * 1024
      && next?.isFile() && !next.isSymbolicLink()
      && ((next.size === prior.size && fs.readFileSync(previous).equals(fs.readFileSync(current)))
        || (marker?.entries?.[path.basename(destination)]?.source === actual
          && marker.entries[path.basename(destination)].manifestSha256 === manifestHash(previous)))) return "compatible";
  }
  throw new Error(`Refusing to replace an existing non-owned skill at ${destination}. Preserve or move it explicitly first.`);
}

export function ownedSkillPaths(home) {
  const root = skillRoot(home);
  const entry = existing(root);
  if (!entry) return [];
  if (!entry.isDirectory() || entry.isSymbolicLink()) throw new Error(`Owned skill storage must be a real directory: ${root}`);
  const marker = readMarker(home);
  const manifests = [];
  for (const name of OWNED_SKILL_NAMES) {
    const expected = source(name);
    const destination = path.join(root, name);
    if (linkState(destination, expected.directory, marker) === "current") {
      manifests.push(path.join(destination, "SKILL.md"), expected.manifest);
    }
  }
  return [...new Set(manifests)];
}

export function ensureOwnedSkills(home) {
  const root = skillRoot(home);
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const entry = fs.lstatSync(root);
  if (!entry.isDirectory() || entry.isSymbolicLink() || fs.realpathSync(root) !== root) {
    throw new Error(`Owned skill storage must be a real directory: ${root}`);
  }
  const marker = readMarker(home);
  const definitions = OWNED_SKILL_NAMES.map(name => ({ ...source(name), destination: path.join(root, name) }));
  // Validate the complete set before changing any link. Existing links are
  // adoptable only with identical bytes or a matching private ownership record.
  const states = definitions.map(item => ({ ...item, state: linkState(item.destination, item.directory, marker) }));
  const created = [];
  const migrated = [];
  for (const item of states) {
    if (item.state === "current") continue;
    if (item.state === "compatible") {
      const previous = fs.lstatSync(item.destination);
      const target = fs.readlinkSync(item.destination);
      const temporary = path.join(root, `.seal-link-${randomUUID()}`);
      fs.symlinkSync(item.directory, temporary, "dir");
      try {
        const now = fs.lstatSync(item.destination);
        if (!now.isSymbolicLink() || now.dev !== previous.dev || now.ino !== previous.ino
          || fs.readlinkSync(item.destination) !== target) {
          throw new Error(`Skill link changed during migration: ${item.destination}. Retry without replacing user data.`);
        }
        fs.renameSync(temporary, item.destination);
        migrated.push(item.destination);
      } finally { if (existing(temporary)) fs.unlinkSync(temporary); }
      continue;
    }
    try { fs.symlinkSync(item.directory, item.destination, "dir"); created.push(item.destination); }
    catch (error) { if (error.code !== "EEXIST" || linkState(item.destination, item.directory, marker) !== "current") throw error; }
  }
  saveMarker(home, marker, definitions);
  return { created, migrated, paths: ownedSkillPaths(home) };
}
