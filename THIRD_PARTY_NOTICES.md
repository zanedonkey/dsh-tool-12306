# Third party notices

## Joooook/12306-mcp

Source: https://github.com/Joooook/12306-mcp

Reviewed commit: ff6439da6f63d7d72181abea4568abd69878c600

The station field layout and supplemental entry (`src/stations/loader.ts`, `missing-stations.ts`), ticket field positions and packed price mapping (`src/parser/ticket.ts`), raw response contracts (`src/types.ts`), and request parameters/discovery patterns (`src/client/`) are adapted from this MIT project. The MCP runtime, transports, server, CLI and model-visible helper tools are not incorporated.

Original license:

```text
MIT License

Copyright (c) 2025 Jok

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## DeepSeek Harness

Source: https://github.com/deepseek-ai/deepseek-harness

Reviewed commit: 5badb15009ae1756c3afe0ae0cef1faafc290ccc

Native plugin contracts follow the official tool-todo, tool authoring and plugin installation references. The project consumes published SDK packages as dependencies/peers; their distribution retains each package's own license. Agent tests use the published official testkit and a locally written, scripted adapter following its StreamChunk contract. No reference repository source tree is distributed in this package.
