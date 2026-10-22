import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import solid from 'vite-plugin-solid';
import { resolve } from 'node:path';
export default defineConfig({
 main:{plugins:[externalizeDepsPlugin()],build:{rollupOptions:{input:{index:resolve('src/main/index.ts')}}}},
 preload:{plugins:[externalizeDepsPlugin()],build:{rollupOptions:{input:{index:resolve('src/preload/index.ts')},output:{format:'cjs',entryFileNames:'index.cjs'}}}},
 renderer:{root:'src/renderer',plugins:[solid()],build:{assetsInlineLimit:0,rollupOptions:{input:resolve('src/renderer/index.html')}}}
});
