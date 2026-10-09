import { defineTool } from '@deepseek-ai/dsh-tools';
import type { RailwayClient } from '../client/index.js';
import { PLUGIN_VERSION, TOOL_NAMES } from '../version.js';

export function pluginInfoTool(client: RailwayClient) {
  return defineTool({
    name: '12306_plugin_info',
    description: '不联网查询当前运行的 12306 插件版本、Node.js 版本、工具能力和超时配置。安装或更新后先调用此工具确认实际加载能力；旧运行进程可能与已安装版本不同。本工具不读取账号、Cookie、Token 或本地路径。',
    parameters: {},
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          packageName: { type: 'string', required: true }, version: { type: 'string', required: true },
          nodeVersion: { type: 'string', required: true },
          tools: { type: 'array', required: true, items: { type: 'string' } },
          capabilities: { type: 'object', required: true, additionalProperties: false, properties: {
            transferPricing: { type: 'boolean', required: true }, compactOutput: { type: 'boolean', required: true }, queryDeadline: { type: 'boolean', required: true },
          } },
          requestTimeoutMs: { type: 'integer', required: true }, queryTimeoutMs: { type: 'integer', required: true },
          note: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute() {
      return {
        packageName: 'dsh-tool-12306', version: PLUGIN_VERSION, nodeVersion: process.version, tools: [...TOOL_NAMES],
        capabilities: { transferPricing: true, compactOutput: true, queryDeadline: true },
        requestTimeoutMs: client.config.timeoutMs, queryTimeoutMs: client.config.queryTimeoutMs,
        note: '显示当前已加载代码及其能力，不比较磁盘安装版本。不提供此工具或能力缺失时，请核对插件加载位置并完全重启 Harness；只看版本号不能证明开发版功能已经发布。',
      };
    },
  });
}
