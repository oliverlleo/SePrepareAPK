import './semantic-lexicon.mjs';
import {catalogs} from './src/i18n-catalogs.js';
import { build } from 'esbuild';
import { cpSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
const out = '../app/src/main/assets';
mkdirSync(out, { recursive: true });
await build({ entryPoints: ['src/app.js'], outfile: `${out}/app.js`, bundle: true, minify: true, format: 'iife', target: 'chrome85', loader: { '.aff': 'text', '.dic': 'text' }, legalComments: 'eof' });
await build({ entryPoints: ['src/review-worker.js'], outfile: `${out}/review-worker.js`, bundle: true, minify: true, format: 'iife', target: 'chrome85', external: ['./spell/dist/Hunspell.js'], loader: { '.aff': 'text', '.dic': 'text' }, legalComments: 'eof' });
// Keep the upstream ES modules unchanged so import.meta.url resolves the local WASM.
mkdirSync(`${out}/spell/dist`,{recursive:true});
mkdirSync(`${out}/spell/wasm`,{recursive:true});
for(const file of ['Hunspell.js','WasmMemoryManager.js','Utilities.js','Utf8.js','TypedArray.js'])cpSync(`node_modules/hunspell-wasm/dist/${file}`,`${out}/spell/dist/${file}`);
for(const file of ['hunspell.js','hunspell.wasm'])cpSync(`node_modules/hunspell-wasm/wasm/${file}`,`${out}/spell/wasm/${file}`);
await build({ entryPoints: ['src/semantic-worker.js'], outfile: `${out}/semantic-worker.js`, bundle: true, minify: true, format: 'iife', target: 'chrome85', external: ['./ai/transformers.web.min.js'], legalComments: 'eof' });
await build({entryPoints:['src/content-index-worker.js'],outfile:`${out}/content-index-worker.js`,bundle:true,minify:true,format:'iife',target:'chrome85',legalComments:'eof'});
mkdirSync(`${out}/ai`,{recursive:true});
mkdirSync(`${out}/ort`,{recursive:true});
cpSync('node_modules/@huggingface/transformers/dist/transformers.min.js',`${out}/ai/transformers.web.min.js`);
for(const file of readdirSync('node_modules/onnxruntime-web/dist'))if(/^ort-wasm.*\.(mjs|wasm)$/.test(file))cpSync(`node_modules/onnxruntime-web/dist/${file}`,`${out}/ort/${file}`);
cpSync('src/style.css', `${out}/style.css`);
cpSync('src/index.html', `${out}/index.html`);
writeFileSync(`${out}/i18n-native.json`,JSON.stringify(catalogs));
mkdirSync(`${out}/branding`, { recursive: true });
for (const file of ['logo-light.png','logo-dark.png']) cpSync(`branding/${file}`, `${out}/branding/${file}`);
mkdirSync(`${out}/fonts`, { recursive: true });
for (const [pkg,files] of Object.entries({inter:['inter-latin-400-normal.woff2','inter-latin-500-normal.woff2','inter-latin-600-normal.woff2','inter-latin-700-normal.woff2'],lora:['lora-latin-400-normal.woff2','lora-latin-500-normal.woff2','lora-latin-600-normal.woff2']})) {
  for (const f of files) cpSync(`node_modules/@fontsource/${pkg}/files/${f}`, `${out}/fonts/${f}`);
}
writeFileSync(`${out}/THIRD_PARTY.txt`,['SePrepare 1.0.69 — componentes de terceiros','Google Identity Services 22.0.0 — termos do SDK Google; AndroidX, Kotlin e coroutines — licenças próprias — consulte licenses/android-components.txt e licenses/google-android-sdk-terms.txt','fflate 0.8.2 — MIT — https://github.com/101arrowz/fflate','Firebase Analytics 23.2.0 e Google Services 4.5.0 — termos do SDK Google — https://firebase.google.com/terms','Quill 2.0.3 — BSD-3-Clause — https://github.com/slab/quill','Hunspell WebAssembly 0.3.0 — LGPL/GPL/MPL — https://github.com/rotemdan/hunspell-wasm — upstream: https://github.com/hunspell/hunspell','dictionary-pt — dicionário português (Hunspell); licença nos arquivos do projeto','Transformers.js 3.8.1 — Apache-2.0 — https://github.com/huggingface/transformers.js','ONNX Runtime — MIT — https://github.com/microsoft/onnxruntime','MiniLM multilíngue — Apache-2.0 — https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2','DOMPurify — Apache-2.0 OR MPL-2.0 — https://github.com/cure53/DOMPurify','Marked — MIT — https://github.com/markedjs/marked','Lucide — ISC — https://github.com/lucide-icons/lucide','Inter — SIL OFL-1.1 — https://github.com/rsms/inter','Lora — SIL OFL-1.1 — https://github.com/cyrealtype/Lora-Cyrillic'].join('\n'));
console.log('Editor e recursos locais gerados.');

mkdirSync(`${out}/licenses`,{recursive:true});
for(const name of ['quill','dictionary-pt','hunspell-wasm','@huggingface/transformers','onnxruntime-web','dompurify','marked','lucide','@fontsource/inter','@fontsource/lora','fflate'])for(const file of readdirSync('node_modules/'+name))if(/license|^copying|^notice/i.test(file))try{cpSync('node_modules/'+name+'/'+file,`${out}/licenses/${name.replaceAll('/','-').replace('@','')}-${file}`);}catch{}

cpSync('../third_party/semantic-model/upstream.json',`${out}/licenses/semantic-model-upstream.json`);
cpSync('node_modules/@huggingface/transformers/LICENSE',`${out}/licenses/semantic-model-Apache-2.0.txt`);

// Read-only help styling and complete notices shipped with the application.
cpSync('src/support.css',`${out}/support.css`);
cpSync('../LICENSE',`${out}/licenses/seprepare-LICENSE.txt`);
cpSync('../LICENSE-ATE-1.0.27-MIT.txt',`${out}/licenses/seprepare-previous-MIT.txt`);
cpSync('../third_party/onnxruntime/LICENSE',`${out}/licenses/onnxruntime-LICENSE`);
for(const file of readdirSync('../third_party/license-texts'))cpSync(`../third_party/license-texts/${file}`,`${out}/licenses/${file}`);

cpSync('src/notes.css',`${out}/notes.css`);
cpSync('src/rhythm.css',`${out}/rhythm.css`);

cpSync('src/drive.css',`${out}/drive.css`);

cpSync('src/share-code.css',`${out}/share-code.css`);

cpSync('src/legal.css',`${out}/legal.css`);

cpSync('src/audio.css',`${out}/audio.css`);

cpSync('src/editor-improvements.css',`${out}/editor-improvements.css`);

cpSync('src/settings-navigation.css',`${out}/settings-navigation.css`);

cpSync('src/presentation-controls.css',`${out}/presentation-controls.css`);
