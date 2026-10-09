import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, expect, it } from 'vitest';
import { Context } from '@deepseek-ai/cordis';
import Loader from '@deepseek-ai/cordis-plugin-loader';
import Include, { applyEntryPatches, entryListSchema } from '@deepseek-ai/cordis-plugin-include';
import SystemPrompt from '@deepseek-ai/dsh-system-prompt';
import ToolRuntime from '@deepseek-ai/dsh-tools';
import { load } from 'js-yaml';
import type { EntryOptions } from '@deepseek-ai/cordis-plugin-loader';
let context: Context | undefined;
let root: string | undefined;
afterEach(async () => {
  await context?.fiber.dispose(); context = undefined;
  if (root) await rm(root, { recursive: true, force: true }); root = undefined;
});
it('loads the compiled plugin via real Loader and YAML without module mocks', async () => {
  const ctx = new Context(); context = ctx;
  await ctx.plugin(SystemPrompt); await ctx.plugin(ToolRuntime);
  root = await mkdtemp(join(tmpdir(), 'dsh-12306-loader-'));
  const path = join(root, 'cordis.yml');
  const pluginUrl = new URL('../dist/index.js', import.meta.url).href;
  await writeFile(path, `- id: rail\n  name: '${pluginUrl}'\n  config:\n    maxResults: 3\n    requestIntervalMs: 100\n`);
  ctx.baseUrl = pathToFileURL(root).href + '/';
  await ctx.plugin(Loader); ctx.loader.builtins.include = Include;
  await ctx.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(path).href } });
  await ctx.loader.await();
  for (const entry of ctx.loader.entries()) await entry.fiber?.await();
  expect(ctx.tools.schemas().map(tool => tool.name)).toEqual(['12306_query_tickets', '12306_query_transfer', '12306_train_route', '12306_plugin_info']);
  const rail = [...ctx.loader.entries()].find(entry => entry.options.id === 'rail');
  expect(rail).toBeDefined(); await rail?.fiber?.dispose(); expect(ctx.tools.schemas()).toEqual([]);
});
it('applies the shipped native bundle patch using official patch composition', async () => {
  const patch = load(await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8'), { schema: entryListSchema });
  const entries = applyEntryPatches([], patch as Parameters<typeof applyEntryPatches>[1], () => { throw new Error('unexpected patch warning'); });
  expect(entries).toEqual([{ id: 'tool-12306', name: 'dsh-tool-12306' }] satisfies EntryOptions[]);
});
