// CI-only dependency selection. Does not relax the public compatibility declaration.
import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
const versions = {
  '0.2.0-rc.2': { cordis: '4.0.4', loader: '1.0.5', include: '1.0.9' },
  '0.2.1-alpha.1': { cordis: '4.0.5-alpha.1', loader: '1.0.6-alpha.1', include: '1.0.10-alpha.1' },
};
const version = process.argv[2];
if (!Object.hasOwn(versions, version ?? '')) throw new Error('Specify verified Harness version: 0.2.0-rc.2 or 0.2.1-alpha.1');
const target = versions[version];
const path = new URL('../package.json', import.meta.url);
const manifest = JSON.parse(readFileSync(path, 'utf8'));
for (const key of Object.keys(manifest.devDependencies)) {
  if (key.startsWith('@deepseek-ai/dsh-')) manifest.devDependencies[key] = version;
}
manifest.devDependencies['@deepseek-ai/cordis'] = target.cordis;
manifest.devDependencies['@deepseek-ai/cordis-plugin-loader'] = target.loader;
manifest.devDependencies['@deepseek-ai/cordis-plugin-include'] = target.include;
const suffix = version === '0.2.0-rc.2' ? 'rc2' : 'alpha';
const lockText = readFileSync(new URL(`../.github/locks/package-lock.${suffix}.json`, import.meta.url), 'utf8');
const lock = JSON.parse(lockText);
const root = lock.packages?.[''];
if (lock.lockfileVersion !== 3 || !root) throw new Error('Expected an npm v3 lockfile with a root package.');
for (const field of ['name', 'version', 'dependencies', 'devDependencies', 'peerDependencies', 'engines']) {
  if (!isDeepStrictEqual(root[field], manifest[field])) throw new Error(`SDK lock is stale: ${field}. Refresh both SDK lock snapshots before running CI.`);
}
writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(new URL('../package-lock.json', import.meta.url), lockText);
console.log(`Selected locked test SDK ${version}; public peer requirements unchanged.`);
