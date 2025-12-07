# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: "[plugin:vite:import-analysis] Failed to resolve import \"socket.io-client\" from \"src/providers/WebSocketProvider.tsx\". Does the file exist?"
  - generic [ref=e5]: /Users/yjcjour/code/image-download-tool/src/providers/WebSocketProvider.tsx:7:27
  - generic [ref=e6]: "17 | var _s = $RefreshSig$(), _s2 = $RefreshSig$(); 18 | import { createContext, useContext, useEffect, useState } from \"react\"; 19 | import { io } from \"socket.io-client\"; | ^ 20 | import { useStore } from \"../store\"; 21 | const WebSocketContext = createContext({"
  - generic [ref=e7]: at TransformPluginContext._formatLog (file:///Users/yjcjour/code/image-download-tool/node_modules/vite/dist/node/chunks/dep-D4NMHUTW.js:42528:41) at TransformPluginContext.error (file:///Users/yjcjour/code/image-download-tool/node_modules/vite/dist/node/chunks/dep-D4NMHUTW.js:42525:16) at normalizeUrl (file:///Users/yjcjour/code/image-download-tool/node_modules/vite/dist/node/chunks/dep-D4NMHUTW.js:40504:23) at process.processTicksAndRejections (node:internal/process/task_queues:105:5) at async file:///Users/yjcjour/code/image-download-tool/node_modules/vite/dist/node/chunks/dep-D4NMHUTW.js:40623:37 at async Promise.all (index 4) at async TransformPluginContext.transform (file:///Users/yjcjour/code/image-download-tool/node_modules/vite/dist/node/chunks/dep-D4NMHUTW.js:40550:7) at async EnvironmentPluginContainer.transform (file:///Users/yjcjour/code/image-download-tool/node_modules/vite/dist/node/chunks/dep-D4NMHUTW.js:42323:18) at async loadAndTransform (file:///Users/yjcjour/code/image-download-tool/node_modules/vite/dist/node/chunks/dep-D4NMHUTW.js:35739:27) at async viteTransformMiddleware (file:///Users/yjcjour/code/image-download-tool/node_modules/vite/dist/node/chunks/dep-D4NMHUTW.js:37254:24
  - generic [ref=e8]:
    - text: Click outside, press Esc key, or fix the code to dismiss.
    - text: You can also disable this overlay by setting
    - code [ref=e9]: server.hmr.overlay
    - text: to
    - code [ref=e10]: "false"
    - text: in
    - code [ref=e11]: vite.config.ts
    - text: .
```