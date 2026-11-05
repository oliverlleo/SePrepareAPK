import assert from 'node:assert/strict';import fs from 'node:fs';import {webcrypto} from 'node:crypto';
import {JSDOM,VirtualConsole} from '../qa/time-dom/node_modules/jsdom/lib/api.js';
import {newSpeech,ensureVersions,captureContentVersion} from './src/core.js';
const doc=newSpeech();doc.id='qa-time';doc.title='Teste de tempos';doc.delta={ops:[{insert:'Introdução\nPonto principal\nConclusão\n'}]};ensureVersions(doc);captureContentVersion(doc);
let stored={schema:1,contentVersion:2,categories:[],speeches:[doc],settings:{theme:'dark',language:'pt-BR'},vocabulary:[]};const errors=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!e.message.includes('navigation'))errors.push(e.message);});
const dom=new JSDOM('<!doctype html><html><body><div id="app"></div><div id="overlays"></div><div id="toast"></div></body></html>',{url:'https://qa.invalid/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});const w=dom.window;
w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;Object.defineProperty(w.crypto,'subtle',{value:webcrypto.subtle});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.Range.prototype.getBoundingClientRect=()=>({left:0,top:0,right:0,bottom:0,height:0,width:0});w.Range.prototype.getClientRects=()=>[];w.ResizeObserver=class{observe(){}disconnect(){}};w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
w.OradorNative={getState:()=>JSON.stringify(stored),saveState:raw=>{stored=JSON.parse(raw);return true;},saveStateWithOrigin:raw=>{stored=JSON.parse(raw);return true;},isLegalNoticeAcknowledged:()=>true,setTheme(){},setAppLanguage(){},keepAwake(){},getVoices:()=>'[]',ready:()=>JSON.stringify({permissions:{notifications:true,exact:true}})};
w.addEventListener('error',e=>errors.push(e.message));
const wait=async test=>{for(let i=0;i<150;i++){if(test())return;await new Promise(r=>setTimeout(r,10));}throw Error('Estado não alcançado');};
const checks=[];function pass(name){checks.push(name);console.log('PASS '+name);}
const click=action=>{const button=w.document.querySelector('[data-action="'+action+'"]');assert(button,action);button.click();};
try{
 w.eval(fs.readFileSync(new URL('../app/src/main/assets/app.js',import.meta.url),'utf8'));await wait(()=>w.orador);
 w.document.querySelector('[data-action="edit"][data-id="qa-time"]').click();await wait(()=>w.orador.getEditor());let q=w.orador.getEditor();
 q.setSelection(15,0,'silent');w.orador.getRuntime().selection={index:15,length:0};click('time-mark');
 w.document.querySelector('#markMinutes').value='3';w.document.querySelector('#markSeconds').value='30';click('time-mark-save');
 assert.equal(q.getContents().ops.find(op=>op.attributes?.['speech-time'])?.attributes['speech-time'],'210');assert(q.root.querySelector('[data-time-label="03:30"]'));assert.equal(q.getText(),'Introdução\nPonto principal\nConclusão\n');pass('Botão aplica marcação sem inserir caracteres no texto');
 q.insertText(0,'Novo parágrafo\n','user');assert(q.root.querySelector('[data-speech-time="210"]').textContent.includes('Ponto principal'));pass('Edição anterior preserva âncora no parágrafo');
 click('time-mark');w.document.querySelector('#markSeconds').value='60';click('time-mark-save');assert(!w.document.querySelector('#markTimeError').hidden);w.document.querySelector('#markSeconds').value='45';click('time-mark-save');assert(q.root.querySelector('[data-time-label="03:45"]'));pass('Editar e validar minutos e segundos');
 click('time-mark');click('time-mark-remove');assert(!q.root.querySelector('[data-time-label]'));pass('Remover limpa metadados e indicador');
 click('time-mark');w.document.querySelector('#markMinutes').value='3';w.document.querySelector('#markSeconds').value='0';click('time-mark-save');click('save-editor');w.orador.flush();
 assert(stored.speeches[0].versions.some(v=>v.delta.ops.some(op=>op.attributes?.['speech-time']==='180')));pass('Salvar confirma marcação na versão e no armazenamento Android');
 click('present');await wait(()=>w.document.querySelector('#readerText'));assert(w.document.querySelector('#readerText [data-speech-time="180"]'));pass('Apresentação preserva atributo pela conversão real do Quill e sanitização');
 const runtime=w.orador.getRuntime(),state=w.orador.getState();assert.equal(runtime.view,'reader');const node=w.document.querySelector('#readerText [data-speech-time]');
 let now=1800000000000;w.Date.now=()=>now;const beforeHistory=stored.speeches[0].rehearsals.length;click('timer-start');
 for(const [seconds,status]of [[120,'early'],[170,'on-time'],[225,'late'],[300,'late']]){now=1800000000000+seconds*1000;await wait(()=>node.dataset.timeState===status&&node.title.includes(seconds===120?'02:00':seconds===170?'02:50':seconds===225?'03:45':'05:00'));assert(node.style.getPropertyValue('--time-background'));}
 pass('Cronômetro real atualiza cores progressivas e diferença na referência ativa');
 click('timer-toggle');const paused=node.dataset.timeLabel;now+=90000;await new Promise(r=>setTimeout(r,350));assert.equal(node.dataset.timeLabel,paused);pass('Pausa conserva tempo e comparação mesmo após passagem do relógio');
 click('timer-restart');await wait(()=>node.dataset.timeLabel.includes('−180s'));assert.equal(stored.speeches[0].rehearsals.length,beforeHistory);pass('Zerar reinicia comparação; rolagem não cria histórico de chegada');
 click('reader-settings');assert(w.document.querySelector('#readTimeMarks').checked);const toggle=w.document.querySelector('#readTimeMarks');toggle.checked=false;toggle.dispatchEvent(new w.Event('change'));assert(w.document.querySelector('#readerText').classList.contains('time-marks-hidden'));assert(stored.speeches[0].delta.ops.some(op=>op.attributes?.['speech-time']==='180'));pass('Leitura oculta sem apagar marcação e persiste preferência');
 assert.deepEqual(errors,[]);pass('Aplicativo inicia, edita e apresenta sem exceções');
}finally{dom.window.close();fs.writeFileSync(new URL('../QA-time-mark-app-1.0.67.json',import.meta.url),JSON.stringify({checks,success:checks.length===11,environment:'real compiled app and Quill in isolated JSDOM; no browser layout engine or physical Android'},null,2));}
