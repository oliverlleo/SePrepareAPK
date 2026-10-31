import {mountReaderTools} from './reader-tools.js';
import {createTimeMarkUI} from './time-mark-ui.js';
import {TIME_MARK_ATTRIBUTE,TIME_POINT_ATTRIBUTE,parseTimeMark} from './time-mark-core.js';
import {pruneRedundantCheckpoints} from './editor-checkpoints.js';
import {mergeImportedMetadata} from './import-metadata.js';
import {editorDelta} from './editor-snapshot.js';
import {createDeletionLedger} from './sync-deletions.js';
import {currentChangeOrigin,withChangeOrigin} from './change-origin.js';
import {mountSettingsNavigation,styleSettingsDialog} from './settings-navigation.js';
import {mountEditorFind} from './editor-find-ui.js';
import {mountToolbarIndicator} from './toolbar-scroll-indicator.js';
import {mountContextHelp} from './editor-context-help.js';
import {dictionaryWords,correctionRecords,rememberedCorrections,rememberCorrection,forgetCorrection,rememberedMatches} from './personal-corrections.js';
import {semanticEdit,formatNewVersion} from './format-destination.js';
import {styledInsertion} from './editor-text-ops.js';
import {t as translateUI,tr as formatUI,h as markupUI,html as htmlUI,uiLocale,setLanguage,normalizeLanguage,systemMessage} from './i18n.js';
import {createShareCodeUI} from './share-code-ui.js';
import {createDriveUI} from './drive-ui.js';
import {CloudAlert,CloudUpload} from 'lucide';
import {createAppUpdatesUI} from './app-updates-ui.js';
import {createLegalNoticeUI} from './legal-ui.js';
import {createAudioPlayer} from './audio-player.js';
import {voiceSample} from './audio-playback-core.js';
import {createVoicePicker} from './voice-picker.js';
import {AUDIO_LANGUAGES,audioLocale,voicesForLocale,selectAudioVoice} from './audio-preferences.js';
import {hasEditorChanges,openEditorDraft,retainEditorDraft,confirmEditorDraft,syncEditorVersionRuntime} from './editor-drafts.js';
import {mountEditorFooter} from './editor-footer.js';
import {createRhythmUI} from './rhythm-ui.js';
import {RHYTHM_ATTRIBUTE,parseRhythm,receiveRhythms} from './rhythm-core.js';
import Quill from 'quill';
import DOMPurify from 'dompurify';
import {marked} from 'marked';
import {createElement,BookOpen,Mic,CalendarDays,FolderOpen,Settings,Plus,Search,ArrowLeft,ArrowRight,ChevronRight,ChevronDown,MoreHorizontal,Pin,PinOff,Play,Pause,Square,RotateCcw,Volume2,VolumeX,SlidersHorizontal,Maximize,Minimize,Check,CheckCheck,CheckSquare,Clock,Timer,Bookmark,Heart,Sun,Moon,Leaf,Star,Users,UserRound,GraduationCap,Lightbulb,Quote,Bold,Italic,Underline,Strikethrough,List,ListFilter,ListOrdered,ListChecks,AlignLeft,AlignCenter,AlignRight,AlignJustify,Highlighter,Type,CaseUpper,CaseLower,Undo2,Redo2,ClipboardPaste,Copy,Scissors,FileText,FilePlus2,FileDown,FileUp,Download,Upload,Trash2,Archive,History,Save,CheckCircle2,AlertCircle,SpellCheck,Sparkles,X,Bell,BellRing,Info,ShieldCheck,Globe,Headphones,Flag,HandHeart,Languages,Link2,Unlink,SeparatorHorizontal,WrapText,Printer,BookMarked,Smile,Music,Home,PenLine,Target,CloudOff,Share2,ArrowUp,ArrowDown,StickyNote,Cloud,Smartphone,CloudDownload} from 'lucide';
import {uid,clone,escape as esc,plain,words,clock,newSpeech,newPart,isPart,typeLabel,participantName,partSegments,partNarration,validState,validateDelta,localRuleMatches} from './core.js';
import {createPartsUI} from './parts-ui.js';
import {createVersionsUI} from './versions-ui.js';
import {mountColorPicker} from './color-picker.js';
import {createSupportUI} from './support-ui.js';
import {createNotesUI} from './notes-ui.js';
import {NOTE_ATTRIBUTE,noteIds} from './notes-core.js';
import {ensureVersions,activeContentVersion,captureContentVersion,projectContentVersion,toggleVersionTimer,finishVersionRehearsal,rehearsalContentLabel,copyDocumentVersions,pauseAllVersionTimers,documentVersionsKey} from './core.js';
import {SPEECH_MIME,portableSharedContent,encodeSpeech,encodeSpeechVersions,decodeSpeech,messageText,messageTextVersions,shareFilename} from './sharing.js';
import {quotationSpans} from './semantic-core.js';
import {refreshHighlightContrast} from './highlight-contrast.js';
import {removeLegacyDefaults} from './migrations.js';

const I={BookOpen,Mic,CalendarDays,FolderOpen,Settings,Plus,Search,ArrowLeft,ArrowRight,ChevronRight,ChevronDown,MoreHorizontal,Pin,PinOff,Play,Pause,Square,RotateCcw,Volume2,VolumeX,SlidersHorizontal,Maximize,Minimize,Check,CheckCheck,CheckSquare,Clock,Timer,Bookmark,Heart,Sun,Moon,Leaf,Star,Users,UserRound,GraduationCap,Lightbulb,Quote,Bold,Italic,Underline,Strikethrough,List,ListFilter,ListOrdered,ListChecks,AlignLeft,AlignCenter,AlignRight,AlignJustify,Highlighter,Type,CaseUpper,CaseLower,Undo2,Redo2,ClipboardPaste,Copy,Scissors,FileText,FilePlus2,FileDown,FileUp,Download,Upload,Trash2,Archive,History,Save,CheckCircle2,AlertCircle,SpellCheck,Sparkles,X,Bell,BellRing,Info,ShieldCheck,Globe,Headphones,Flag,HandHeart,Languages,Link2,Unlink,SeparatorHorizontal,WrapText,Printer,BookMarked,Smile,Music,Home,PenLine,Target,CloudOff,Share2,ArrowUp,ArrowDown,StickyNote,Cloud,Smartphone,CloudDownload};
const icon=(name,cls='')=>{if(String(name).startsWith('emoji:'))return markupUI`<span class="${cls}" aria-hidden="true">${esc(String(name).slice(6))}</span>`;const node=createElement(I[name]||BookOpen);node.setAttribute('aria-hidden','true');if(cls)node.setAttribute('class',cls);return node.outerHTML;};
Object.assign(I,{CloudAlert,CloudUpload,CloudCheck:['svg',Cloud[1],[['path',{d:'M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242'}],['path',{d:'m8 17 3 3 6-6'}]]]});
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const native=window.OradorNative;
const APP_VERSION='1.0.72';
const APP_VERSION_CODE=73;
const Delta=Quill.import('delta'),BlockEmbed=Quill.import('blots/block/embed');
const Parchment=Quill.import('parchment');
class NoteAttributor extends Parchment.Attributor{canAdd(node,value){return typeof value==='string'&&noteIds(value).length>0&&noteIds(value).join(' ')===value&&super.canAdd(node,value);}}
Quill.register(new NoteAttributor(NOTE_ATTRIBUTE,'data-presenter-note',{scope:Parchment.Scope.INLINE}),true);
class RhythmAttributor extends Parchment.Attributor{canAdd(node,value){return !!parseRhythm(value)&&super.canAdd(node,value);}}
Quill.register(new RhythmAttributor(RHYTHM_ATTRIBUTE,'data-speech-rhythm',{scope:Parchment.Scope.INLINE}),true);
class TimeAttributor extends Parchment.Attributor{canAdd(node,value){return parseTimeMark(value)!==null&&super.canAdd(node,value);}}
Quill.register(new TimeAttributor(TIME_MARK_ATTRIBUTE,'data-speech-time',{scope:Parchment.Scope.BLOCK}),true);
Quill.register(new TimeAttributor(TIME_POINT_ATTRIBUTE,'data-speech-time-point',{scope:Parchment.Scope.INLINE}),true);
const Font=Quill.import('attributors/style/font');Font.whitelist=['Inter','Lora','Georgia','Arial','Verdana','Times New Roman','monospace'];Quill.register(Font,true);
const Size=Quill.import('attributors/style/size');Size.whitelist=['12px','14px','16px','18px','20px','22px','24px','26px','28px','30px','32px','36px','40px','44px','48px'];Quill.register(Size,true);
const Kind=new Parchment.ClassAttributor('speech-kind','ql-speech',{scope:Parchment.Scope.BLOCK,whitelist:['question','scripture']});Quill.register(Kind,true);
const Ordinal=new Parchment.ClassAttributor('ordinal','ql-ordinal',{scope:Parchment.Scope.BLOCK,whitelist:['true']});Quill.register(Ordinal,true);
class SpeakerAttributor extends Parchment.Attributor{canAdd(node,value){try{return super.canAdd(node,value)&&typeof value==='string'&&isPart(active())&&active().participants.some(p=>p.id===value);}catch{return false;}}}
const Speaker=new SpeakerAttributor('speaker','data-speaker',{scope:Parchment.Scope.INLINE});Quill.register(Speaker,true);
class PageBreak extends BlockEmbed{static blotName='pagebreak';static tagName='hr';static className='ql-page-break';static create(){const node=super.create();node.setAttribute('contenteditable','false');node.setAttribute('aria-label',translateUI('Quebra de página'));return node;}static value(){return true;}}
Quill.register(PageBreak);
const parseEl=document.createElement('div');parseEl.style.display='none';document.body.append(parseEl);
const parser=new Quill(parseEl,{modules:{toolbar:false},theme:null});
function addMatchers(q){
  q.clipboard.addMatcher('MARK',(node,delta)=>delta.compose(new Delta().retain(delta.length(),{background:'#f8e4a1',bold:true})));
  q.clipboard.addMatcher('P.question',(node,delta)=>delta.compose(new Delta().retain(Math.max(0,delta.length()-1)).retain(1,{'speech-kind':'question'})));
  q.clipboard.addMatcher('P.scripture',(node,delta)=>delta.compose(new Delta().retain(Math.max(0,delta.length()-1)).retain(1,{'speech-kind':'scripture'})));
  q.clipboard.addMatcher('HR',()=>new Delta().insert({pagebreak:true}));
}
addMatchers(parser);
function cleanHTML(html,privateNotes=false){return DOMPurify.sanitize(html,{ALLOWED_TAGS:['p','div','span','b','strong','i','em','u','s','del','strike','mark','blockquote','h1','h2','h3','h4','h5','h6','br','ul','ol','li','a','hr','sub','sup'],ALLOWED_ATTR:['style','class','href','target','rel','data-list','data-speech-rhythm','data-speech-time','data-speech-time-point',...(privateNotes?['data-presenter-note']:[])],ALLOW_DATA_ATTR:false});}
function deltaFromHTML(html,terminal=true){const delta=parser.clipboard.convert({html:cleanHTML(html)});if(terminal&&(!delta.ops.length||typeof delta.ops.at(-1)?.insert!=='string'||!delta.ops.at(-1).insert.endsWith('\n')))delta.insert('\n');return {ops:delta.ops};}
function htmlFromDelta(delta,privateNotes=false){parser.setContents(delta,'silent');return cleanHTML(parser.getSemanticHTML(),privateNotes).replace(/&nbsp;/g,' ').replace(/\u00a0/g,' ');}

const defaults={schema:1,contentVersion:2,categories:[],speeches:[],settings:{language:'pt-BR',theme:'light',pace:125,audioLanguage:'',voice:'',rate:1,onlineReview:false,reviewEndpoint:'https://api.languagetool.org/v2/check'},vocabulary:[]};
let state,storedRaw='',stateReadFailed=false;
try{storedRaw=native?native.getState():localStorage.getItem('orador-state-v1');state=storedRaw?validState(JSON.parse(storedRaw)):null;}catch(e){state=null;stateReadFailed=true;window.setTimeout(()=>toast(translateUI('Não foi possível ler os dados salvos. Os originais foram preservados; exporte um backup para recuperação.')),1500);}
if(!state)state=clone(defaults);
const deletionLedger=createDeletionLedger(state,()=>JSON.parse(native?.driveBackupIndex?.()||'{}'));
setLanguage(state.settings.language);
native?.setAppLanguage?.(normalizeLanguage(state.settings.language));
const bootLabel=document.querySelector('.boot p');if(bootLabel)bootLabel.textContent=translateUI('Preparando suas palavras.');
const rt={view:'home',speechId:null,filter:'all',typeFilter:'all',search:'',sort:'updated',q:null,selection:{index:0,length:0},returnTo:'home',page:0,focus:false,audio:{state:'idle',offset:0,end:0,text:'',speechId:null},voices:[],permissions:{notifications:!native,exact:!native},review:null,incomingSpeech:null,importQueue:[]};
const contextHelp=mountContextHelp();let editorFind=null,disposeToolbarIndicator=()=>{},disposeReaderTools=()=>{},settingsNav=null;
let saveTimeout,toastTimeout,worker,semanticWorker,audioPlayer,voicePicker,lastCommittedRaw=storedRaw;let disposeEditorFooter=()=>{};
// Autosave protects a separate draft. Presentation reads only confirmed content.
let editorDocument=null;
const confirmedDocument=()=>state.speeches.find(s=>s.id===rt.speechId);
const active=()=>rt.view==='editor'&&editorDocument?.id===rt.speechId?editorDocument:confirmedDocument();
const category=id=>state.categories.find(c=>c.id===id)||{id:'',name:translateUI('Sem categoria'),icon:'FolderOpen',color:'#738176'};
const ib=(action,name,label,extra='',cls='')=>markupUI`<button type="button" class="icon-btn ${cls}" data-action="${action}" aria-label="${esc(label)}" title="${esc(label)}" ${extra}>${icon(name)}</button>`;
const btn=(action,label,name='',cls='',extra='')=>markupUI`<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${name?icon(name):''}<span>${esc(label)}</span></button>`;
const tool=(action,name,label,extra='')=>markupUI`<button type="button" class="tool" data-action="${action}" aria-label="${esc(label)}" title="${esc(label)}" ${extra}>${icon(name)}</button>`;
const categoryIcon=(name,color)=>color?markupUI`<span class="category-icon" style="color:${esc(color)}">${icon(name)}</span>`:icon(name);
const option=(action,name,title,detail='',extra='',danger='',iconColor='')=>markupUI`<button type="button" class="sheet-option ${danger}" data-action="${action}" ${extra}>${categoryIcon(name,iconColor)}<span><strong>${esc(title)}</strong>${detail?markupUI`<small>${esc(detail)}</small>`:''}</span>${icon('ChevronRight')}</button>`;
function dateLabel(ms,options={day:'2-digit',month:'short'}){return new Date(ms).toLocaleDateString(uiLocale(),options);}
function timeLabel(ms){return new Date(ms).toLocaleTimeString(uiLocale(),{hour:'2-digit',minute:'2-digit'});}
function toast(message){const target=$('#toast');target.textContent=systemMessage(message);target.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>target.classList.remove('show'),3300);}
const isDefaultTitle=value=>['Discurso sem título','Parte sem título','Untitled speech','Untitled part','Discurso sin título','Parte sin título','無題のスピーチ','無題のパート','Demonstração sem título','Untitled demonstration','Demostración sin título','無題の実演'].includes(value);
function syncCurrent(){const s=active();if(!s)return;if(rt.view==='editor'&&$('#speechTitle')){s.title=$('#speechTitle').value.trim()||(isPart(s)?translateUI('Parte sem título'):translateUI('Discurso sem título'));s.subtitle=$('#speechSubtitle')?.value||'';}if(rt.q)s.delta=editorDelta(rt.q);pruneRedundantCheckpoints(s);captureContentVersion(s);}
function persist(immediate=false,origin=currentChangeOrigin()){if(origin==='user'&&rt.view==='settings')origin='local-configuration';clearTimeout(saveTimeout);if(stateReadFailed)return false;syncCurrent();if(rt.view==='editor'&&editorDocument&&confirmedDocument())retainEditorDraft(state,confirmedDocument(),editorDocument);updateEditorSaveButton();if(!immediate){const status=$('#saveStatus');if(status)status.innerHTML=icon('Save')+(rt.view==='editor'?translateUI('Salvando rascunho…'):translateUI('Salvando…'));saveTimeout=setTimeout(()=>persist(true),450);return;}
  for(const doc of state.speeches)ensureVersions(doc);
  deletionLedger.prepare(state,origin);
  const json=JSON.stringify(state);let success=true;
  try{if(json===lastCommittedRaw)success=true;else if(native)success=native.saveStateWithOrigin?native.saveStateWithOrigin(json,origin):native.saveState(json);else localStorage.setItem('orador-state-v1',json);}catch(e){success=false;}
  const status=$('#saveStatus');if(status)status.innerHTML=icon(success?'CheckCheck':'AlertCircle')+(success?(rt.view==='editor'&&editorDocument&&hasEditorChanges(confirmedDocument(),editorDocument)?translateUI('Rascunho salvo no aparelho'):translateUI('Salvo no aparelho')):translateUI('Falha ao salvar'));
  if(success){lastCommittedRaw=json;deletionLedger.commit(state);}
  if(!success)toast(translateUI('Não foi possível salvar. Exporte um backup antes de fechar.'));
  return success;
}
window.oradorFlush=()=>persist(true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)persist(true);});window.addEventListener('pagehide',()=>persist(true));
window.addEventListener('focus',()=>{if(state&&rt.view!=='editor'&&typeof expireTrash==='function')expireTrash();});
function contentSnapshot(s){return {type:s.type||'speech',title:s.title,subtitle:s.subtitle,delta:clone(s.delta),presenterNotes:clone(s.presenterNotes||[]),...(isPart(s)?{partFormat:2,participants:clone(s.participants),myParticipantId:s.myParticipantId}:{})};}
function updateEditorSaveButton(){
  const s=active(),button=$('.editor-save');if(rt.view!=='editor'||!s||!button)return;
  const saved=!hasEditorChanges(confirmedDocument(),s),action=saved?'present':'save-editor',label=saved?translateUI('Visualizar'):translateUI('Salvar');
  if(button.dataset.action===action&&button.querySelector('span')?.textContent===label)return;
  button.dataset.action=action;button.setAttribute('aria-label',label);button.innerHTML=icon(saved?'Play':'Check')+markupUI`<span>${label}</span>`;
}
function saveEditorChanges(){
 if(rt.view!=='editor'||!editorDocument)return false;
 syncCurrent();const previous=confirmedDocument(),index=state.speeches.indexOf(previous),drafts=clone(state.editorDrafts||[]),pending=clone(editorDocument);
 if(index<0)return false;
 const next=confirmEditorDraft(previous,editorDocument);state.speeches[index]=next;
 for(const key of Object.keys(editorDocument))delete editorDocument[key];Object.assign(editorDocument,clone(next));projectContentVersion(editorDocument);
 if(persist(true)===false){state.speeches[index]=previous;state.editorDrafts=drafts;for(const key of Object.keys(editorDocument))delete editorDocument[key];Object.assign(editorDocument,pending);projectContentVersion(editorDocument);updateEditorSaveButton();return false;}
 updateEditorSaveButton();toast(translateUI('Alterações salvas. A apresentação foi atualizada.'));return true;
}
function checkpoint(label=translateUI('Texto anterior')){syncCurrent();const s=active();if(!s)return;s.history||=[];const snap=contentSnapshot(s),last=s.history.at(-1);if(last&&JSON.stringify(contentSnapshot(last))===JSON.stringify(snap))return;s.history.push({id:uid(),at:Date.now(),label,automaticCheckpoint:true,versionId:s.activeVersionId,...snap});s.history=s.history.slice(-15);}
function applyTheme(){const dark=state.settings.theme==='dark';document.body.classList.toggle('dark',dark);native?.setTheme(dark);refreshHighlightContrast();}
function go(view,id=rt.speechId){
 if(view==='part')view='editor';if(persist(true)===false&&!stateReadFailed)return false;
 const target=state.speeches.find(s=>s.id===id),nextEditor=view==='editor'&&target?openEditorDraft(state,target,{preferSavedVersion:rt.view==='reader'&&id===rt.speechId}):null;
 rt.q=null;closeModal();editorDocument=nextEditor;rt.view=view;rt.speechId=id;rt.page=0;rt.focus=false;render();audioPlayer?.update();window.scrollTo(0,0);native?.keepAwake(view==='reader');return true;
}
function render(){
  if(settingsNav){if(rt.modal==='settings-panel')closeModal();settingsNav.destroy();settingsNav=null;}
  const language=normalizeLanguage(state.settings.language);if(document.documentElement.lang!==({en:'en-US',es:'es-ES',ja:'ja-JP'}[language]||'pt-BR')){setLanguage(language);native?.setAppLanguage?.(language);supportUI=createSupportUI({icon,btn,openModal,version:APP_VERSION});}
  disposeReaderTools();notesUI.detach();disposeEditorFooter();editorFind?.destroy();editorFind=null;disposeToolbarIndicator();contextHelp.hide();
  document.body.classList.toggle('editor-open',['editor','part'].includes(rt.view));document.body.classList.toggle('reader-open',rt.view==='reader');document.body.classList.remove('focus-mode');
  applyTheme();
  if(rt.view==='part')rt.view='editor';if(rt.view==='editor'){renderEditor();return;}if(rt.view==='reader'){renderReader();return;}
  const names={home:[translateUI('Seu caderno'),translateUI('Discursos e partes, no seu ritmo.')],agenda:[translateUI('Sua agenda'),translateUI('Prepare com calma. Apresente com confiança.')],categories:[translateUI('Cada assunto, seu lugar'),translateUI('Organize seus discursos e partes do seu jeito.')],settings:[translateUI('Ajustes'),translateUI('Seu espaço de preparação, do seu jeito.')]};
  const [title,subtitle]=names[rt.view]||names.home;
  $('#app').innerHTML=markupUI`<div class="app-shell${rt.view!=='settings'?' has-fab':''}"><header class="topbar"><div class="brand"><img class="brand-logo brand-logo-light" src="branding/logo-light.png" width="2172" height="724" alt="SePrepare — Crie, ensaie e apresente"><img class="brand-logo brand-logo-dark" src="branding/logo-dark.png" width="2172" height="724" alt="SePrepare — Crie, ensaie e apresente"></div><div class="top-actions">${ib('import','FileUp',translateUI('Importar preparação'))}${ib('theme',state.settings.theme==='dark'?'Sun':'Moon',translateUI('Alternar tema'))}</div></header><section class="welcome"><div><div class="eyebrow">${rt.view==='home'?translateUI('Um espaço para suas palavras'):translateUI('Seu caderno de preparações')}</div><h1>${title}</h1><p>${subtitle}</p></div>${btn(rt.view==='categories'?'new-category':'new-item',rt.view==='categories'?translateUI('Nova categoria'):translateUI('Criar'),'Plus')}</section><div id="viewContent"></div></div><nav class="bottom-nav" aria-label="Navegação principal">${[['home','BookOpen',translateUI('Caderno')],['agenda','CalendarDays',translateUI('Agenda')],['categories','FolderOpen',translateUI('Categorias')],['settings','Settings',translateUI('Ajustes')]].map(([v,i,l])=>markupUI`<button type="button" class="nav-item ${rt.view===v?'active':''}" data-action="nav" data-view="${v}" ${rt.view===v?'aria-current="page"':''}>${icon(i)}<span>${l}</span></button>`).join('')}</nav>${rt.view!=='settings'?markupUI`<button type="button" class="fab" data-action="${rt.view==='categories'?'new-category':'new-item'}" aria-label="${rt.view==='categories'?translateUI('Nova categoria'):translateUI('Criar')}">${icon('Plus')}</button>`:''}`;
  if(rt.view==='home')renderHome();else if(rt.view==='agenda')renderAgenda();else if(rt.view==='categories')renderCategories();else renderSettings();
  audioPlayer?.update();if(rt.view==='home')setTimeout(()=>updatesUI.drain(),0);
}
function typeBadge(s){return markupUI`<span class="item-type ${isPart(s)?'part-type':''}">${icon(isPart(s)?'Users':'Mic')}${typeLabel(s)}</span>`;}
function speechCard(s){const c=category(s.categoryId),text=plain(s.delta).trim(),type=typeLabel(s).toLowerCase();return markupUI`<article class="speech-card" data-type="${s.type||'speech'}">${s.pinned?icon('Pin','pin-corner'):''}<button type="button" class="speech-card-main" data-action="open" data-id="${esc(s.id)}"><div class="card-labels">${typeBadge(s)}<span class="category-tag"><span class="category-dot" style="color:${c.color}">${icon(c.icon)}</span>${esc(c.name)}</span>${driveUI.cardIndicator(s)}</div><h3>${esc(isDefaultTitle(s.title)&&isPart(s)?translateUI('Demonstração sem título'):s.title)}</h3><p class="card-snippet">${esc(text.slice(0,160)||(isPart(s)?translateUI('Escreva ou cole a parte inteira e identifique quem fala.'):translateUI('Seu próximo discurso começa aqui.')))}</p>${isPart(s)?markupUI`<span class="card-participants">${s.participants.length} participantes · ${partSegments(s).filter(t=>t.participantId&&t.text.trim()).length} trechos identificados</span>`:''}</button><div class="card-foot"><span>${s.scheduledAt?dateLabel(s.scheduledAt)+' · '+timeLabel(s.scheduledAt):s.targetMinutes+' min · '+words(text)+translateUI(' palavras')}</span><div class="card-actions">${ib('edit','PenLine',translateUI('Editar ')+type,`data-id="${esc(s.id)}"`)}${ib('share','Share2',translateUI('Compartilhar ')+type,`data-id="${esc(s.id)}"`)}${ib('speech-menu','MoreHorizontal',translateUI('Opções da preparação'),`data-id="${esc(s.id)}"`)}</div></div></article>`;}
function visibleSpeeches(){return state.speeches.filter(s=>!s.deleted);}
function renderHome(){
  const all=visibleSpeeches(),next=all.filter(s=>s.scheduledAt>Date.now()).sort((a,b)=>a.scheduledAt-b.scheduledAt)[0];
  const types=[['all',translateUI('Todos')],['speech',translateUI('Discursos')],['part',translateUI('Partes')]],filters=[['all',translateUI('Todos'),'BookOpen'],['pinned',translateUI('Fixados'),'Pin'],...state.categories.map(c=>[c.id,c.name,c.icon,c.color])],selectedFilter=filters.find(([id])=>id===rt.filter)||filters[0];
  $('#viewContent').innerHTML=markupUI`${next?markupUI`<section class="next-card"><div class="next-icon">${icon('CalendarDays')}</div><div><div class="eyebrow">${isPart(next)?translateUI('Sua próxima parte'):translateUI('Seu próximo discurso')}</div><h3>${esc(next.title)}</h3><div class="next-meta"><span>${dateLabel(next.scheduledAt,{weekday:'short',day:'2-digit',month:'long'})} · ${timeLabel(next.scheduledAt)}</span><span>·</span><span>${next.targetMinutes} minutos</span></div></div>${ib('open','ArrowRight',translateUI('Abrir próxima preparação'),`data-id="${esc(next.id)}"`)}</section>`:''}<div class="search-row"><label class="searchbox">${icon('Search')}<input id="searchSpeeches" type="search" placeholder="Encontre suas palavras…" aria-label="Pesquisar discursos" value="${esc(rt.search)}"></label>${ib('sort','SlidersHorizontal',translateUI('Ordenar discursos'),'','filled')}</div><div class="home-filter-row"><div class="type-filters" role="group" aria-label="Tipo de preparação">${types.map(([v,label])=>markupUI`<button type="button" class="type-filter ${rt.typeFilter===v?'active':''}" data-action="type-filter" data-value="${v}" aria-pressed="${rt.typeFilter===v}">${label}</button>`).join('')}</div><div class="filters" role="group" aria-label="Filtrar categorias">${filters.map(([id,label,i,color])=>markupUI`<button type="button" class="chip ${rt.filter===id?'active':''}" data-action="filter" data-id="${esc(id)}">${categoryIcon(i,color)}${esc(label)}</button>`).join('')}</div><label class="home-category-picker ${rt.filter!=='all'?'active':''}" title="${esc(selectedFilter[1])}">${categoryIcon(selectedFilter[2],selectedFilter[3])}<span class="home-category-label">${esc(selectedFilter[1])}</span>${icon('ChevronDown')}<select id="homeCategoryFilter" aria-label="Filtrar categorias e fixados">${filters.map(([id,label])=>markupUI`<option value="${esc(id)}" ${rt.filter===id?'selected':''}>${esc(label)}</option>`).join('')}</select></label></div><div id="speechResults"></div>`;
  renderSpeechResults();$('#searchSpeeches').addEventListener('input',e=>{rt.search=e.target.value;renderSpeechResults();});
  $('#homeCategoryFilter').addEventListener('change',e=>{rt.filter=e.target.value;renderHome();$('#homeCategoryFilter').focus({preventScroll:true});});
}
function renderSpeechResults(){
  let list=visibleSpeeches().filter(s=>(rt.typeFilter==='all'||s.type===rt.typeFilter||!s.type&&rt.typeFilter==='speech')&&(rt.filter==='all'||rt.filter==='pinned'&&s.pinned||s.categoryId===rt.filter)&&(!rt.search||(`${s.title} ${s.subtitle} ${plain(s.delta)} ${(s.participants||[]).map(p=>p.name).join(' ')}`).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{M}/gu,'').includes(rt.search.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{M}/gu,''))));
  list.sort((a,b)=>Number(b.pinned)-Number(a.pinned)||(rt.sort==='title'?a.title.localeCompare(b.title,'pt-BR'):rt.sort==='date'?(a.scheduledAt||Infinity)-(b.scheduledAt||Infinity):b.updatedAt-a.updatedAt));
  const pinned=list.filter(s=>s.pinned),others=list.filter(s=>!s.pinned);
  const group=(label,items)=>items.length?markupUI`<div class="section-head"><h3>${label}</h3><span>${items.length} ${items.length===1?'item':'itens'}</span></div><div class="speech-grid">${items.map(speechCard).join('')}</div>`:'';
  $('#speechResults').innerHTML=list.length?group(translateUI('Sempre por perto'),pinned)+group(pinned.length?translateUI('Seu caderno'):translateUI('Discursos e partes'),others):markupUI`<div class="empty">${icon('BookOpen')}<h3>${rt.search?translateUI('Nenhum item encontrado'):translateUI('Um novo começo')}</h3><p>${rt.search?translateUI('Experimente outro título, palavra ou categoria.'):translateUI('Crie um discurso ou uma parte com participantes e falas.')}</p>${btn('new-item',translateUI('Criar minha primeira preparação'),'Plus')}</div>`;
  void driveUI.refreshCards();
}
function renderAgenda(){
  const scheduled=visibleSpeeches().filter(s=>s.scheduledAt).sort((a,b)=>a.scheduledAt-b.scheduledAt),now=Date.now(),future=scheduled.filter(s=>s.scheduledAt>=now),past=scheduled.filter(s=>s.scheduledAt<now).reverse();
  const group=(label,items)=>items.length?markupUI`<div class="section-head"><h3>${label}</h3><span>${items.length}</span></div>${items.map(s=>markupUI`<article class="agenda-day"><div class="date-square"><strong>${new Date(s.scheduledAt).getDate()}</strong><span>${dateLabel(s.scheduledAt,{month:'short'}).replace('.','')}</span></div><div class="agenda-content"><h3>${esc(s.title)}</h3>${typeBadge(s)}<div class="agenda-meta">${icon('Clock')}${timeLabel(s.scheduledAt)} · ${s.targetMinutes} min · ${esc(category(s.categoryId).name)}</div><div class="row">${btn('open',translateUI('Abrir ')+typeLabel(s).toLowerCase(),'BookOpen','small secondary',`data-id="${esc(s.id)}"`)}${btn('schedule',translateUI('Lembretes'),'Bell','small soft',`data-id="${esc(s.id)}"`)}</div></div></article>`).join('')}`:'';
  $('#viewContent').innerHTML=scheduled.length?group(translateUI('A caminho'),future)+group(translateUI('Apresentações anteriores'),past):markupUI`<div class="empty">${icon('CalendarDays')}<h3>Um espaço na sua agenda</h3><p>Agende um discurso ou uma parte e escolha quando receber os lembretes.</p>${btn('choose-schedule',translateUI('Agendar preparação'),'Plus')}</div>`;
}
function renderCategories(){
  $('#viewContent').innerHTML=state.categories.length?markupUI`<div class="category-grid">${state.categories.map(c=>markupUI`<article class="category-card"><div class="cat-head"><span class="cat-symbol" style="color:${c.color}">${icon(c.icon)}</span>${ib('edit-category','MoreHorizontal',translateUI('Editar categoria'),`data-id="${esc(c.id)}"`)}</div><h3>${esc(c.name)}</h3><p>${visibleSpeeches().filter(s=>s.categoryId===c.id).length} itens</p>${btn('open-category',translateUI('Explorar'),'ArrowRight','link',`data-id="${esc(c.id)}"`)}</article>`).join('')}</div>`:markupUI`<div class="empty">${icon('FolderOpen')}<h3>Suas categorias começam aqui</h3><p>Escolha o nome, o ícone e a cor para organizar seus discursos e partes.</p>${btn('new-category',translateUI('Criar minha primeira categoria'),'Plus')}</div>`;
}
function renderSettings(){
  $('#viewContent').innerHTML=markupUI`<div class="settings-list"><section class="setting-card developer-support-card"><h3>${icon('HandHeart')}Gostou do SePrepare?</h3><p class="developer-support-lead"><em>Ajude esse projeto a crescer.</em></p><p>O SePrepare é desenvolvido de forma independente. Seu apoio espontâneo ajuda a manter o aplicativo acessível e incentiva novas melhorias.</p><p class="developer-support-note">A contribuição é voluntária e não oferece benefícios exclusivos. O aplicativo continua gratuito para todos.</p>${btn('developer-support',translateUI('Apoiar o desenvolvedor'),'HandHeart','small')}</section><section class="setting-card language-card"><h3>${icon('Languages')}Idioma do aplicativo</h3><p>Altera os menus e as mensagens. Seus textos não são traduzidos.</p><div class="field"><label for="appLanguage">Idioma</label><select id="appLanguage" lang="${uiLocale()}">${[['pt-BR','Português (Brasil)'],['en','English'],['es','Español'],['ja','日本語']].map(([code,label])=>markupUI`<option value="${code}" lang="${code}" ${normalizeLanguage(state.settings.language)===code?'selected':''}>${label}</option>`).join('')}</select></div></section><section class="setting-card guide-card"><h3>${icon('BookOpen')}Um guia para se preparar</h3><p>Passos simples para escrever, organizar suas falas, revisar e ensaiar com confiança.</p>${btn('guide',translateUI('Abrir guia prático'),'ArrowRight','small secondary')}</section><section class="setting-card drive-backup-setting"><h3>${icon('Cloud')}Backup e recuperação</h3>${driveUI.settingsEntry()}</section><section class="setting-card"><h3>${icon('Volume2')}Sua voz de leitura</h3><p>Ao mudar o idioma do aplicativo, a leitura seleciona automaticamente a Voz 1 correspondente. Em Ajustes de áudio, você pode escolher outra voz offline, a voz padrão do aparelho e a velocidade.</p>${btn('audio-settings',translateUI('Ajustes de áudio'),'Headphones','small secondary')}</section><section class="setting-card"><h3>${icon('SpellCheck')}Revisão de português</h3><p>O motor Hunspell com o dicionário VERO e as regras locais funciona sem internet. A revisão online opcional usa o LanguageTool e envia somente o trecho escolhido quando você tocar em revisar.</p><label class="check-label"><input id="onlineReview" type="checkbox" ${state.settings.onlineReview?'checked':''}>Habilitar revisão online ao solicitar</label><div class="field" style="margin-top:13px"><label for="reviewEndpoint">Endereço do corretor</label><input type="url" id="reviewEndpoint" value="${esc(state.settings.reviewEndpoint)}"><small>Use HTTPS. O serviço público possui limites; também é possível usar uma instância própria.</small></div><div class="row wrap" style="margin-top:13px">${btn('save-review-settings',translateUI('Salvar ajustes'),'Check','small secondary')}${btn('dictionary',translateUI('Meu dicionário'),'BookMarked','small soft')}</div></section><section class="setting-card"><h3>${icon('Timer')}Seu ritmo de apresentação</h3><p>A estimativa de leitura usa seu ritmo. O cronômetro mede o tempo real de cada ensaio.</p><div class="field"><label for="readingPace">Palavras por minuto</label><input type="number" id="readingPace" min="70" max="250" value="${state.settings.pace}"></div>${btn('save-pace',translateUI('Salvar ritmo'),'Check','small secondary','style="margin-top:13px"')}<div class="divider"></div>${btn('rhythm-manager',translateUI('Gerenciar ritmos'),'Music','small soft')}</section><section class="setting-card"><h3>${icon('Bell')}Lembretes no Android</h3><p>Escolha a antecedência em cada discurso. Ao tocar na notificação, o discurso correspondente é aberto.</p><div class="row wrap">${btn('notifications',translateUI('Permitir notificações'),'BellRing','small secondary')}${btn('exact-alarms',translateUI('Horários precisos'),'Clock','small secondary')}</div><div class="permission-note" id="permissionsSummary">${permissionSummary()}</div></section>${legalUI.settingsCard()}<section class="setting-card"><h3>${icon('Archive')}Lixeira</h3><p>Discursos excluídos ficam na lixeira por 30 dias e podem ser esvaziados manualmente.</p>${btn('trash',translateUI('Abrir lixeira'),'Trash2','small secondary')}<div class="divider"></div><div class="row spread"><span class="notice">SePrepare · versão ${APP_VERSION}</span>${btn('about',translateUI('Sobre e licenças'),'Info','small link')}</div></section></div>`;
  $('#appLanguage').addEventListener('change',e=>{const previous={language:normalizeLanguage(state.settings.language),audioLanguage:state.settings.audioLanguage,voice:state.settings.voice},previousAudio=audioLocale(state.settings),next=normalizeLanguage(e.target.value),scroll=window.scrollY;state.settings.language=next;state.settings.audioLanguage='';state.settings.voice='';loadVoices();const firstVoice=selectAudioVoice(rt.voices,audioLocale({language:next}),'');state.settings.audioLanguage=firstVoice?firstVoice.locale:'';state.settings.voice=firstVoice?firstVoice.name:'';if(persist(true)===false){Object.assign(state.settings,previous);e.target.value=previous.language;return;}if(rt.audio.state==='playing'&&(previousAudio!==audioLocale(state.settings)||previous.voice!==state.settings.voice))pauseAudio();setLanguage(next);native?.setAppLanguage?.(next);supportUI=createSupportUI({icon,btn,openModal,version:APP_VERSION});render();window.scrollTo(0,scroll);toast(translateUI('Idioma atualizado.'));});
  $('#onlineReview').addEventListener('change',e=>{state.settings.onlineReview=e.target.checked;persist();});
  settingsNav=mountSettingsNavigation({host:$('#viewContent'),query:rt.settingsQuery||'',onQuery:value=>{rt.settingsQuery=value;},icon,escape:esc,openModal,mark:()=>{rt.modal='settings-panel';},appearance:appearanceSettings,count:value=>formatUI`${value} ajustes encontrados`,empty:()=>translateUI('Nenhum ajuste encontrado')});
}
function appearanceSettings(){
 openModal(translateUI('Aparência'),markupUI`<div class="stack"><p class="help">Escolha o tema do aplicativo.</p><label class="settings-theme-choice"><input type="radio" name="settingsTheme" value="light" ${state.settings.theme!=='dark'?'checked':''}>${icon('Sun')}<span>Tema claro</span></label><label class="settings-theme-choice"><input type="radio" name="settingsTheme" value="dark" ${state.settings.theme==='dark'?'checked':''}>${icon('Moon')}<span>Tema escuro</span></label></div>`,btn('close-modal',translateUI('Concluir'),'Check'));rt.modal='settings-panel';
 styleSettingsDialog('appearance');
 $$('input[name="settingsTheme"]').forEach(input=>input.addEventListener('change',()=>{const previous=state.settings.theme;state.settings.theme=input.value;applyTheme();if(persist(true)===false){state.settings.theme=previous;applyTheme();$$('input[name="settingsTheme"]').forEach(field=>field.checked=field.value===previous);return;}const button=$('.app-shell .top-actions [data-action="theme"]');if(button)button.innerHTML=icon(state.settings.theme==='dark'?'Sun':'Moon');}));
}
function permissionSummary(){return native?formatUI`Notificações: ${rt.permissions.notifications?translateUI('permitidas'):translateUI('aguardando permissão')} · Horários: ${rt.permissions.exact?translateUI('precisos'):translateUI('aproximados')}.`:translateUI('No APK, os lembretes usam as notificações do Android.');}
function renderEditor(){
  const s=active();if(!s){go('home');return;}
  ensureVersions(s);const c=category(s.categoryId);
  $('#app').innerHTML=markupUI`<main class="editor-shell ${isPart(s)?'part-editor':''}"><header class="editor-top"><div class="editor-name">${ib('back','ArrowLeft',translateUI('Voltar'))}<div><div class="name">${isPart(s)?translateUI('Editor da parte'):translateUI('Seu espaço de escrita')}</div><div class="save-status" id="saveStatus">${icon(hasEditorChanges(confirmedDocument(),s)?'FileText':'CheckCheck')}${hasEditorChanges(confirmedDocument(),s)?translateUI('Rascunho salvo no aparelho'):translateUI('Salvo no aparelho')}</div></div></div><div class="top-actions">${ib('speech-menu','MoreHorizontal',translateUI('Opções'),`data-id="${esc(s.id)}"`)}${btn('save-editor',translateUI('Salvar'),'Check','editor-save')}</div></header><section class="editor-info">${typeBadge(s)}<textarea id="speechTitle" class="title-input" rows="1" aria-label="${isPart(s)?translateUI('Título da parte'):translateUI('Título do discurso')}" maxlength="400">${esc(isDefaultTitle(s.title)?'':s.title)}</textarea><input id="speechSubtitle" class="subtitle-input" placeholder="Referência, tema ou observação…" aria-label="Subtítulo ou referência" value="${esc(s.subtitle)}" maxlength="1000"><div class="editor-meta">${versionsUI.selector()}<button type="button" class="meta-button" data-action="assign-category"><span class="category-icon" id="editorCategoryIcon" style="color:${c.color}">${icon(c.icon)}</span><span id="editorCategory">${esc(c.name)}</span>${icon('ChevronDown')}</button><button type="button" class="meta-button" data-action="duration">${icon('Timer')}<span id="editorDuration">${s.targetMinutes} minutos</span></button><button type="button" class="meta-button" data-action="schedule" data-id="${esc(s.id)}">${icon('CalendarDays')}${s.scheduledAt?dateLabel(s.scheduledAt):translateUI('Agendar')}</button></div></section>${isPart(s)?htmlUI('<section id="partAssignments" class="part-assignment-bar" aria-label="Identificar quem fala no trecho selecionado"></section>'):''}<div class="editor-tools"><div class="toolbar-wrap"><div class="toolbar" role="toolbar" aria-label="Formatação de texto">${tool('undo','Undo2',translateUI('Desfazer'))}${tool('redo','Redo2',translateUI('Refazer'))}${tool('editor-find','Search',translateUI('Buscar e substituir'))}<span class="tool sep"></span>${tool('format','Bold',translateUI('Negrito'),'data-format="bold"')}${tool('format','Italic',translateUI('Itálico'),'data-format="italic"')}${tool('format','Underline',translateUI('Sublinhado'),'data-format="underline"')}${tool('format','Strikethrough',translateUI('Tachado'),'data-format="strike"')}<span class="tool sep"></span>${tool('font','Type',translateUI('Fontes e tamanhos'))}${tool('colors','Highlighter',translateUI('Cor e marca-texto'))}${tool('more-format','ListChecks',translateUI('Mais formatação'))}<span class="tool sep"></span>${tool('paste','ClipboardPaste',translateUI('Colar texto'))}</div></div><div class="editor-smart-actions-wrap"><div class="editor-smart-actions" role="group" aria-label="Ferramentas de escrita e apresentação">${btn('time-mark',translateUI('Marcar tempo'),'Clock','small soft',htmlUI('id="editorTimeAction"'))}${btn('rhythm-menu',translateUI('Ritmo'),'Music','small soft rhythm-action',htmlUI('id="rhythmAction"'))}${btn('notes-list',translateUI('Anotar'),'PenLine','small soft note-action',htmlUI('id="annotateSelection" aria-label="Anotações privadas"'))}${btn('auto-format',translateUI('Formatar'),'Sparkles','small',htmlUI('id="editorFormatAction"'))}${btn('review',translateUI('Revisar'),'SpellCheck','small secondary')}</div></div></div><div class="scope-bar"><span class="scope-state" id="scopeLabel">${icon('FileText')}Aplicar ao discurso inteiro</span><button type="button" data-action="select-all">Selecionar tudo</button></div><div class="editor-scroll"><article class="editor-page"><div id="textEditor"></div></article></div><footer class="editor-status"><span id="wordCount"></span><button type="button" id="estimatedTime" data-action="rhythm-analysis"></button><button type="button" class="meta-button" data-action="pages">${icon('FileText')}${translateUI('Página')}</button><button type="button" class="editor-footer-close" data-action="editor-footer-close" aria-label="Ocultar rodapé" title="Ocultar rodapé" hidden>${icon('X')}</button></footer></main>`;
  const q=new Quill('#textEditor',{theme:null,placeholder:translateUI('Comece com uma ideia. Suas palavras ganham forma aqui…'),modules:{toolbar:false,history:{delay:800,maxStack:100,userOnly:false}}});
  rt.q=q;rt.selection={index:0,length:0};addMatchers(q);q.setContents(s.delta,'silent');q.history.clear();timeMarkUI.refreshEditor();
  q.on('text-change',()=>{s.updatedAt=Date.now();syncCurrent();updateEditorStats();partsUI.refresh();refreshHighlightContrast();notesUI.refreshEditor();timeMarkUI.refreshEditor();persist();});
  q.on('selection-change',range=>{if(range)rt.selection=range;updateScope();});
  // O cabeçalho recolhe ao rolar o documento para baixo e PERMANECE recolhido
  // ao voltar ao início, permitindo editar a primeira linha sem saltos no layout.
  // Para revelar os dados, faça uma nova puxada para baixo a partir do topo.
  // A mesma regra vale para retrato/paisagem em celular e tablet.
  (()=>{
  const editorScroll=document.querySelector('.editor-scroll'),editorShell=document.querySelector('.editor-shell');
  if(!editorScroll||!editorShell)return;
  const revealHeader=()=>{
    if(editorScroll.scrollTop<=2)editorShell.classList.remove('editor-scrolled');
  };
  editorScroll.addEventListener('scroll',()=>{
    if(editorScroll.scrollTop>12)editorShell.classList.add('editor-scrolled');
  },{passive:true});
  let pullStartY=0,pullEligible=false,pullDistance=0;
  editorScroll.addEventListener('touchstart',e=>{
    pullStartY=e.touches[0]?.clientY??0;
    pullEligible=editorShell.classList.contains('editor-scrolled')&&editorScroll.scrollTop<=2;
    pullDistance=0;
  },{passive:true});
  editorScroll.addEventListener('touchmove',e=>{
    if(!pullEligible)return;
    pullDistance=Math.max(pullDistance,(e.touches[0]?.clientY??pullStartY)-pullStartY);
  },{passive:true});
  editorScroll.addEventListener('touchend',()=>{
    if(pullEligible&&pullDistance>=80)revealHeader();
    pullEligible=false;
  },{passive:true});
  editorScroll.addEventListener('touchcancel',()=>{pullEligible=false;},{passive:true});
  // Roda do mouse / trackpad: somente uma NOVA rolagem iniciada já no topo.
  let lastWheelAt=0,wheelEligible=false,wheelPull=0;
  editorScroll.addEventListener('wheel',e=>{
    const now=performance.now();
    if(now-lastWheelAt>250){
      wheelEligible=editorShell.classList.contains('editor-scrolled')&&editorScroll.scrollTop<=2;
      wheelPull=0;
    }
    lastWheelAt=now;
    if(!wheelEligible||editorScroll.scrollTop>2){wheelEligible=false;return;}
    wheelPull=e.deltaY<0?wheelPull-e.deltaY:0;
    if(wheelPull>=120){revealHeader();wheelEligible=false;}
  },{passive:true});
  })();
  q.root.setAttribute('aria-label',isPart(s)?translateUI('Texto completo da parte'):translateUI('Texto do discurso'));q.root.setAttribute('spellcheck','true');q.root.setAttribute('lang','pt-BR');
  const title=$('#speechTitle');title.placeholder=isPart(s)?translateUI('Título da parte'):translateUI('Título do discurso');const resize=()=>{title.style.height='auto';title.style.height=title.scrollHeight+'px';};resize();
  title.addEventListener('input',()=>{resize();s.updatedAt=Date.now();persist();});$('#speechSubtitle').addEventListener('input',()=>{s.updatedAt=Date.now();persist();});
  disposeEditorFooter=mountEditorFooter(document.querySelector('.editor-shell'));{const upper=mountToolbarIndicator($('.toolbar')),lower=mountToolbarIndicator($('.editor-smart-actions'));disposeToolbarIndicator=()=>{upper();lower();};}editorFind=mountEditorFind({q,root:$('.editor-shell'),Delta,icon,persist,checkpoint,toast});rhythmUI.attach(q);updateEditorStats();updateScope();updateEditorSaveButton();refreshHighlightContrast();notesUI.refreshEditor();
}
const CLEAR_STYLE_FORMATS=['bold','italic','underline','strike','color','background','font','size','link','script','header','list','blockquote','align','speech-kind','ordinal'];
function updateFormatAction(){const q=rt.q,button=$('#editorFormatAction');if(!q||!button)return;const r=scope(),hasStyle=attrs=>CLEAR_STYLE_FORMATS.some(name=>!!attrs?.[name]),formatted=hasStyle(q.getFormat(r.index,r.length))||q.getContents(r.index,r.length).ops.some(op=>hasStyle(op.attributes)),label=translateUI(formatted?'Desformatar':'Formatar');button.dataset.action=formatted?'clear-format':'auto-format';button.innerHTML=icon(formatted?'X':'Sparkles')+markupUI`<span>${label}</span>`;button.setAttribute('aria-label',label);button.title=label;}
function updateEditorStats(){if(!rt.q)return;updateFormatAction();const n=words(rt.q.getText());$('#wordCount').textContent=formatUI`${n} ${n===1?translateUI('palavra'):translateUI('palavras')} · ${rt.q.getLength()-1} caracteres`;rhythmUI.stats();}
function scope(){const len=Math.max(0,(rt.q?.getLength()||1)-1);let r=rt.selection||{index:0,length:0};return r.length>0?{index:Math.max(0,Math.min(r.index,len)),length:Math.min(r.length,len-r.index)}:{index:0,length:len};}
function updateScope(){updateFormatAction();const l=$('#scopeLabel');if(l)l.innerHTML=icon(rt.selection.length?'Highlighter':'FileText')+htmlUI('<span>')+(rt.selection.length?formatUI`${rt.selection.length} caracteres selecionados`:isPart(active())?translateUI('Aplicar à parte inteira'):translateUI('Aplicar ao discurso inteiro'))+htmlUI('</span>');if(rt.q){const fmt=rt.q.getFormat(scope().index,scope().length);$$('[data-action="format"]').forEach(b=>{const on=!!fmt[b.dataset.format];b.setAttribute('aria-pressed',String(on));b.classList.toggle('active',on);});}partsUI.refresh();notesUI.updateAction();}
function format(name,value){if(!rt.q)return;checkpoint(translateUI('Antes de formatar'));const r=scope(),q=rt.q;if(value===undefined)value=!q.getFormat(r.index,r.length)[name];if(['list','blockquote','align','header','speech-kind','ordinal'].includes(name))q.formatLine(r.index,Math.max(1,r.length),name,value,'user');else if(r.length)q.formatText(r.index,r.length,name,value,'user');else q.format(name,value,'user');q.history.cutoff();persist();updateScope();}
function changeCase(mode){if(!rt.q)return;const r=scope();if(!r.length)return;checkpoint(translateUI('Antes de mudar maiúsculas/minúsculas'));const source=rt.q.getContents(r.index,r.length),replacement=new Delta();for(const op of source.ops)replacement.insert(typeof op.insert==='string'?(mode==='upper'?op.insert.toLocaleUpperCase('pt-BR'):op.insert.toLocaleLowerCase('pt-BR')):op.insert,op.attributes);rt.q.updateContents(new Delta().retain(r.index).delete(r.length).concat(replacement),'user');rt.selection={index:r.index,length:replacement.length()};rt.q.setSelection(rt.selection,'silent');rt.q.history.cutoff();persist(true);closeModal();updateScope();toast(mode==='upper'?translateUI('Texto convertido para MAIÚSCULAS.'):translateUI('Texto convertido para minúsculas.'));}
function canFilterMyLines(s){return isPart(s)&&s.participants.some(p=>p.id===s.myParticipantId);}
function onlyMyLines(s){return canFilterMyLines(s)&&s.read?.onlyMine===true;}
function readerIdentity(s){
  if(!isPart(s))return '';
  return markupUI`<div class="reader-identity"><span>${s.myParticipantId?markupUI`Suas falas: <strong>${esc(participantName(s,s.myParticipantId))}</strong>`:translateUI('Acompanhando todas as falas')}</span><div class="reader-identity-actions">${btn('choose-my-participant',translateUI('Quem sou eu'),'Users','small secondary')}${ib('toggle-my-lines','ListFilter',translateUI('Ver somente minhas falas'),`aria-pressed="${onlyMyLines(s)}" ${canFilterMyLines(s)?'':'disabled'}`,'reader-only-mine')}</div></div>`;
}
function toggleMyLines(){
  const s=active();if(!canFilterMyLines(s))return;
  s.read.onlyMine=!onlyMyLines(s);rt.page=0;persist(true);
  const button=$('[data-action="toggle-my-lines"]');button.setAttribute('aria-pressed',String(s.read.onlyMine));
  renderReaderContent();markAudioParagraph();toast(s.read.onlyMine?translateUI('Mostrando somente suas falas.'):translateUI('Mostrando todas as falas.'));
}
function renderReader(){
  const s=active();if(!s){go('home');return;}ensureVersions(s);const r=s.read||{};s.read={fontSize:27,zoom:100,line:1.7,font:'',highlights:true,onlyMine:false,...r};if(!canFilterMyLines(s))s.read.onlyMine=false;
  $('#app').innerHTML=markupUI`<div class="read-progress" id="readProgress"></div><main class="reader-shell"><header class="reader-top"><div class="row">${ib('back','ArrowLeft',translateUI('Voltar'))}<span class="tiny muted">MODO DE APRESENTAÇÃO</span></div><div class="top-actions">${ib('edit','PenLine',translateUI('Editar discurso'),`data-id="${esc(s.id)}"`)}${ib('reader-settings','SlidersHorizontal',translateUI('Ajustes'))}${ib('focus','Maximize',translateUI('Modo foco'))}</div></header><section class="reader-heading"><div class="reader-type-row">${typeBadge(s)}<div class="eyebrow">${esc(category(s.categoryId).name)} · ${s.targetMinutes} minutos</div></div><h1>${esc(s.title)}</h1>${s.subtitle?markupUI`<p>${esc(s.subtitle)}</p>`:''}<div class="row reader-meta">${versionsUI.selector()}<button type="button" class="meta-button reader-share" data-action="share" aria-label="Compartilhar ${isPart(s)?translateUI('parte'):translateUI('discurso')}">${icon('Share2')}<span>Compartilhar</span></button><span class="badge">${words(plain(s.delta))} palavras</span>${s.scheduledAt?markupUI`<span class="badge">${dateLabel(s.scheduledAt)} · ${timeLabel(s.scheduledAt)}</span>`:''}</div></section>${readerIdentity(s)}<section class="reader-controls"><div class="reader-primary-timer"><button type="button" class="start-reading" data-action="timer-start"><span id="startTimerIcon">${icon(s.timer?.running?'Pause':'Play')}</span><span id="startTimerLabel">${s.timer?.running?translateUI('Cronômetro em andamento'):s.timer?.elapsedMs?translateUI('Continuar cronômetro'):translateUI('Iniciar cronômetro')}</span></button>${ib('timer-stop','Square',translateUI('Encerrar ensaio'),'id="primaryTimerStop" hidden','filled timer-stop')}</div><div class="reader-subtools">${btn('speak',rt.audio.state==='playing'?translateUI('Pausar'):translateUI('Ouvir'),rt.audio.state==='playing'?'Pause':'Volume2','secondary')}${ib('audio-settings','Headphones',translateUI('Voz e velocidade'),'','filled')}${notesUI.readerToggle()}${ib('toggle-time-marks','Clock',translateUI('Mostrar tempo'),'id="readerTimeToggle" aria-pressed="false"','filled')}${ib('toggle-reader-rhythms','Music',translateUI('Mostrar ritmo'),'id="readerRhythmToggle" aria-pressed="false"','filled')}${ib('reader-settings','SlidersHorizontal',translateUI('Ajustes'),'','filled')}</div>${audioPlayer.readerControls()}</section><article class="reader-paper"><div class="reader-text" id="readerText"></div></article><div id="pageControls"></div><div class="reader-end"><p>Um pensamento de cada vez.</p>${btn('finish-rehearsal',translateUI('Finalizar ensaio'),'Check','small link','style="margin-top:12px"')}</div></main><div class="timer-dock" id="timerDock" hidden><button type="button" class="timer-button" id="timerDisplay" data-action="timer-toggle" aria-label="Pausar ou continuar cronômetro"><span id="timerIcon">${icon('Pause')}</span><span class="timer-value" id="timerValue">00:00</span></button>${ib('timer-toggle','Pause',translateUI('Pausar cronômetro'),'id="dockTimerToggle"','dock-timer-toggle')}${ib('timer-stop','Square',translateUI('Encerrar ensaio'),'id="dockTimerStop" hidden','timer-stop')}${ib('timer-restart','RotateCcw',translateUI('Zerar cronômetro'))}</div>`;
  renderReaderContent();applyReadSettings();renderTimer();updateAudioButtons();disposeReaderTools=mountReaderTools($('.reader-subtools'),{'audio-settings':translateUI('Voz'),'toggle-presenter-notes':translateUI('Anotações'),'toggle-time-marks':translateUI('Tempo'),'toggle-reader-rhythms':translateUI('Ritmo'),'reader-settings':translateUI('Ajustes')});
}
function deltaPages(delta,privateNotes=false){const d=document.createElement('div');d.innerHTML=htmlFromDelta(delta,privateNotes);const pages=[''];for(const node of [...d.childNodes]){if(node.nodeName==='HR')pages.push('');else pages[pages.length-1]+=node.outerHTML||esc(node.textContent);}return pages;}
function documentPages(s,mine=s.myParticipantId||'',onlyMine=false,privateNotes=false){
 if(!isPart(s))return deltaPages(s.delta,privateNotes);const pages=[''],segments=partSegments(s);let offset=0;
 segments.forEach((segment,n)=>{const name=participantName(s,segment.participantId),spoken=(segment.participantId?name+':\n':'')+segment.text.trimEnd(),start=offset;offset+=spoken.length+(n<segments.length-1?2:0);const own=!!mine&&segment.participantId===mine;if(onlyMine&&!own)return;
  deltaPages(segment.delta,privateNotes).forEach((html,index)=>{if(index)pages.push('');pages[pages.length-1]+=markupUI`<section class="reading-turn ${own?'mine':''} ${segment.participantId?'':'unassigned'}" data-participant="${esc(segment.participantId)}" data-audio-start="${start}" data-audio-end="${offset}"><header class="speaker-label">${esc(name)}${index?translateUI(' · continuação'):''}${own?htmlUI('<span>Sua fala</span>'):''}</header><div class="reading-turn-body">${html||htmlUI('<p><br></p>')}</div></section>`;});
 });return pages;
}
function documentHTML(s,mine=s.myParticipantId||''){return documentPages(s,mine).join(htmlUI('<hr class="ql-page-break">'));}
function renderReaderContent(){const s=active();if(!s||!$('#readerText'))return;rt.pages=documentPages(s,s.myParticipantId||'',onlyMyLines(s),s.read.showPresenterNotes!==false).filter(Boolean);if(!rt.pages.length)rt.pages=[onlyMyLines(s)?markupUI`<div class="reader-filter-empty" role="status">${icon('UserRound')}<p>Nenhuma fala sua identificada nesta parte.</p><small>Identifique seus trechos no editor ou desative o filtro para ver todas as falas.</small></div>`:htmlUI('<p><br></p>')];rt.page=Math.max(0,Math.min(rt.page,rt.pages.length-1));$('#readerText').innerHTML=s.layout==='pages'?rt.pages[rt.page]:rt.pages.join(htmlUI('<hr class="ql-page-break">'));for(const node of $('#readerText').children)node.dataset.narrationLength=String(node.textContent.length+1);const controls=$('#pageControls');if(controls)controls.innerHTML=s.layout==='pages'&&rt.pages.length>1?markupUI`<div class="page-nav">${btn('prev-page',translateUI('Anterior'),'ArrowLeft','secondary small',rt.page===0?'disabled':'')}<span>Página ${rt.page+1} de ${rt.pages.length}</span>${btn('next-page',translateUI('Próxima'),'ArrowRight','secondary small',rt.page===rt.pages.length-1?'disabled':'')}</div>`:'';applyReadSettings();}
function applyReadSettings(){updateReaderVisibilityButtons();const s=active();if(!s||!$('#readerText'))return;const r=s.read;$('#readerText').dataset.fontOverride=String(!!r.font);document.documentElement.style.setProperty('--speech-font',['Inter','Lora','Arial','Georgia','Verdana','Times New Roman','monospace'].includes(r.font)?r.font:'Inter');document.documentElement.style.setProperty('--speech-size',`${r.fontSize}px`);document.documentElement.style.setProperty('--speech-line',r.line);document.documentElement.style.setProperty('--zoom',r.zoom/100);document.body.classList.toggle('highlights-off',!r.highlights);for(const el of $$('#readerText [style*="font-size"]')){if(!el.dataset.documentSize)el.dataset.documentSize=el.style.fontSize;const px=Number.parseFloat(el.dataset.documentSize);if(Number.isFinite(px)&&el.dataset.documentSize.endsWith('px'))el.style.fontSize=(px*r.fontSize/17)+'px';}refreshHighlightContrast();notesUI.refreshReader();rhythmUI.refreshReader();timeMarkUI.refreshReader();}
function updateReaderVisibilityButtons(){
 const read=active()?.read;if(!read)return;
 for(const [id,shown,show,hide] of [['readerTimeToggle',read.showTimeMarks!==false,'Mostrar tempo','Ocultar tempo'],['readerRhythmToggle',read.showRhythms===true,'Mostrar ritmo','Ocultar ritmo']]){const button=$('#'+id);if(!button)continue;button.setAttribute('aria-pressed',String(shown));button.setAttribute('aria-label',translateUI(shown?hide:show));button.title=translateUI(shown?hide:show);}
}
function toggleReaderTimeMarks(){const s=active();if(!s)return;const previous=s.read.showTimeMarks;s.read.showTimeMarks=previous===false;if(persist(true)===false){if(previous===undefined)delete s.read.showTimeMarks;else s.read.showTimeMarks=previous;return;}timeMarkUI.refreshReader();updateReaderVisibilityButtons();}
function timerElapsed(s=active()){const t=s?.timer;if(!t)return 0;return Math.max(0,t.elapsedMs||0)+(t.running?Math.max(0,Date.now()-t.startedAt):0);}
function renderTimer(){if(rt.view!=='reader')return;timeMarkUI.tick();const s=active(),t=s?.timer;if(!s||!t||!$('#timerDock'))return;const hasSession=!!t.running||t.elapsedMs>0;$('#timerDock').dataset.session=String(hasSession);$('#timerDock').dataset.running=String(!!t.running);for(const stop of $$('[data-action="timer-stop"]'))stop.hidden=!hasSession;$('#startTimerIcon').innerHTML=icon(t.running?'Pause':'Play');$('[data-action="timer-start"]').setAttribute('aria-label',t.running?translateUI('Pausar cronômetro'):t.elapsedMs?translateUI('Continuar cronômetro'):translateUI('Iniciar cronômetro'));$('#timerDock').hidden=!t.running&&!t.elapsedMs&&!t.active;$('#timerValue').textContent=clock(timerElapsed(s));$('#timerIcon').innerHTML=icon(t.running?'Pause':'Play');$('#dockTimerToggle').innerHTML=icon(t.running?'Pause':'Play');const toggleLabel=t.running?translateUI('Pausar cronômetro'):t.elapsedMs?translateUI('Continuar cronômetro'):translateUI('Iniciar cronômetro');$('#dockTimerToggle').setAttribute('aria-label',toggleLabel);$('#dockTimerToggle').title=toggleLabel;$('#timerDisplay').classList.toggle('paused',!t.running);$('#timerDisplay').classList.toggle('over',timerElapsed(s)>=s.targetMinutes*60000);$('#timerDisplay').setAttribute('aria-label',formatUI`${t.running?translateUI('Pausar'):t.elapsedMs?translateUI('Continuar'):translateUI('Iniciar')} cronômetro: ${clock(timerElapsed(s))}`);const label=$('#startTimerLabel');if(label)label.textContent=t.running?translateUI('Cronômetro em andamento'):t.elapsedMs?translateUI('Continuar cronômetro'):translateUI('Iniciar cronômetro');}
function toggleTimer(){const s=active();if(!s)return;toggleVersionTimer(s);persist(true);renderTimer();}
function restartTimer(){const s=active();s.timer={active:true,running:false,elapsedMs:0,startedAt:0};persist(true);renderTimer();toast(translateUI('Cronômetro zerado.'));}
function finishRehearsal(){const s=active();if(!s)return;const result=finishVersionRehearsal(s);if(!result){toast(translateUI('Inicie o cronômetro para registrar um ensaio.'));return;}persist(true);renderTimer();toast(result.duration>0?formatUI`Ensaio salvo: ${clock(result.duration)}.`:translateUI('Cronômetro encerrado.'));}
function toggleFocus(){rt.focus=!rt.focus;document.body.classList.toggle('focus-mode',rt.focus);if(rt.focus)window.scrollTo(0,0);notesUI.refreshReader();audioPlayer?.update();}
setInterval(renderTimer,250);window.addEventListener('scroll',()=>{const bar=$('#readProgress');if(bar){const max=document.documentElement.scrollHeight-innerHeight;bar.style.width=`${max>0?Math.min(100,window.scrollY/max*100):100}%`;}},{passive:true});

function openModal(title,body,footer='',wide=false){
  settingsNav?.release();
  editorFind?.close();contextHelp.hide();
  if(rt.q){const r=rt.q.getSelection();if(r)rt.selection=r;}
  $('#overlays').innerHTML=markupUI`<div class="modal-backdrop"><section class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><header class="modal-head"><h2 id="modalTitle">${esc(title)}</h2>${ib('close-modal','X',translateUI('Fechar'))}</header><div class="modal-body">${body}</div>${footer?markupUI`<footer class="modal-footer">${footer}</footer>`:''}</section></div>`;
  const backdrop=$('.modal-backdrop');backdrop.addEventListener('click',e=>{if(e.target===backdrop)closeModal();});
  audioPlayer?.updateFloating();const first=$('.modal input:not([type=color]):not([type=checkbox]):not([type=range])');if(first && !['date','datetime-local','number'].includes(first.type))setTimeout(()=>first.focus({preventScroll:true}),150);
}
function closeModal(){if(rt.modal==='legal-notice')return false;settingsNav?.release();rhythmUI.onClose();if(rt.modal==='audio-settings')audioPlayer?.stopPreview();if(rt.modal==='semantic'&&rt.highlightPreview?.loading){semanticWorker?.postMessage({type:'cancel',token:rt.highlightPreview.token});rt.highlightPreview.loading=false;rt.highlightPreview.cancelled=true;}updatesUI.onClose(rt.modal);setTimeout(()=>{driveUI.drain();updatesUI.drain();},0);const incoming=rt.modal==='incoming';if(incoming)rt.incomingSpeech=null;rt.modal='';const el=$('#overlays');if(el)el.innerHTML='';audioPlayer?.update();if(incoming&&rt.importQueue.length)setTimeout(()=>{if(!rt.incomingSpeech){const next=rt.importQueue.shift();if(next)handleImport(next.name,next.text,next.speechOnly);}},0);}
function scopeDescription(){const r=scope();return rt.selection.length?formatUI`Somente o trecho selecionado (${r.length} caracteres).`:isPart(active())?translateUI('A parte inteira. Selecione um trecho para alterar somente ele.'):translateUI('O discurso inteiro. Selecione um trecho no editor para alterar somente ele.');}

function speechMenu(id){if(id)rt.speechId=id;const s=active();if(!s)return;
  openModal(isPart(s)?translateUI('Sua parte'):translateUI('Seu discurso'),markupUI`<p class="help">${esc(s.title)}</p><div class="sheet-options">${option('edit','PenLine',isPart(s)?translateUI('Editar parte'):translateUI('Editar texto'),isPart(s)?translateUI('Texto completo e identificação de quem fala.'):translateUI('Continue de onde parou.'),`data-id="${esc(s.id)}"`)}${option('open','Play',translateUI('Apresentar'),translateUI('Texto ampliado e cronômetro.'),`data-id="${esc(s.id)}"`)}${option('pin',s.pinned?'PinOff':'Pin',s.pinned?translateUI('Desafixar ')+typeLabel(s).toLowerCase():translateUI('Fixar no topo'),translateUI('Sempre por perto na sua página inicial.'))}${option('schedule','CalendarDays',translateUI('Agendar e lembrar'),translateUI('Data, horário e antecedência.'),`data-id="${esc(s.id)}"`)}${option('share','Share2',translateUI('Compartilhar ')+typeLabel(s).toLowerCase(),translateUI('Como mensagem ou arquivo do SePrepare.'),`data-id="${esc(s.id)}"`)}${option('notes-list','PenLine',translateUI('Anotações privadas'),translateUI('Orientações vinculadas aos trechos, só para você.'))}${option('history','History',translateUI('Versões e ensaios'),translateUI('Recupere versões e acompanhe seus tempos.'))}${option('export-speech','FileDown',translateUI('Exportar ')+typeLabel(s).toLowerCase(),translateUI('Arquivo SePrepare, HTML ou texto simples.'))}${option('duplicate','Copy',translateUI('Duplicar ')+typeLabel(s).toLowerCase(),translateUI('Cria uma cópia independente.'))}${option('delete-speech','Trash2',translateUI('Mover para a lixeira'),translateUI('Você poderá restaurar depois.'),'','danger')}</div>`);
}
const categoryIcons=['BookOpen','Mic','Leaf','Heart','Star','Users','GraduationCap','Lightbulb','Quote','Bookmark','Sun','HandHeart','Flag','Languages','Headphones','ShieldCheck','BookMarked','Smile','Music','Home','PenLine','Target','CalendarDays','FolderOpen'];
const categoryColors=[['#637765','Verde'],['#4678a8','Azul'],['#8962ac','Roxo'],['#b36280','Rosa'],['#b88636','Dourado'],['#2a9184','Turquesa']];
function editCategory(id){const c=state.categories.find(c=>c.id===id)||{id:'',name:'',icon:'BookOpen',color:'#637765'};rt.editCategoryId=c.id;
  openModal(c.id?translateUI('Sua categoria'):translateUI('Nova categoria'),markupUI`<div class="stack"><div class="field"><label for="categoryName">Nome da categoria</label><input id="categoryName" maxlength="70" placeholder="Como você quer organizar?" value="${esc(c.name)}"></div><div class="category-preview"><span class="category-preview-icon" id="categoryPreviewIcon"></span><div><strong id="categoryPreviewName"></strong><small>Prévia da categoria</small></div></div><div class="field"><label>Ícone</label><div class="icon-grid category-icon-grid" id="categoryIconGrid" data-chosen="${esc(c.icon)}">${categoryIcons.map(i=>markupUI`<button type="button" class="icon-btn" data-action="category-icon" data-icon="${i}" aria-label="${i}">${icon(i)}</button>`).join('')}</div></div><div class="field"><label for="categoryColorButton">Cor do ícone</label><div class="category-color-palette" role="group" aria-label="Cores do ícone">${categoryColors.map(([color,label])=>markupUI`<button type="button" class="category-color-choice" style="--swatch:${color}" data-action="category-color" data-color="${color}" aria-label="${translateUI(label)}" aria-pressed="false">${icon('Check')}</button>`).join('')}</div><input id="categoryColor" type="hidden" value="${c.color}"><button type="button" class="category-custom-color" id="categoryColorButton" data-action="category-custom-color" aria-controls="categoryColorPicker" aria-expanded="false"><span class="category-color-sample" id="categoryColorSample" aria-hidden="true"></span><span>Personalizar cor<small id="categoryColorValue"></small></span>${icon('SlidersHorizontal')}</button><div class="inline-color-picker" id="categoryColorPicker" role="group" aria-label="Personalizar a cor do ícone" hidden></div></div><div class="field"><label for="categoryEmoji">Ou use um emoji próprio</label><input id="categoryEmoji" maxlength="12" placeholder="Ex.: 🌿" value="${c.icon.startsWith('emoji:')?esc(c.icon.slice(6)):''}"><small>Emojis mantêm suas próprias cores.</small></div>${c.id?markupUI`<div class="divider"></div>${btn('delete-category',translateUI('Excluir categoria'),'Trash2','danger small')}<p class="notice">Os itens permanecem no caderno e ficam sem categoria.</p>`:''}</div>`,btn('save-category',translateUI('Salvar categoria'),'Check'));
  for(const field of ['categoryName','categoryEmoji','categoryColor'])$('#'+field).addEventListener('input',updateCategoryAppearance);
  const picker=$('#categoryColorPicker');picker.colorPicker=mountColorPicker(picker,{value:c.color,onChange:color=>{$('#categoryColor').value=color;updateCategoryAppearance();}});
  updateCategoryAppearance();
}
function updateCategoryAppearance(){
  const input=$('#categoryColor');if(!input)return;
  const color=input.value,grid=$('#categoryIconGrid'),emoji=$('#categoryEmoji').value.trim(),chosen=emoji?'emoji:'+emoji:grid.dataset.chosen;
  grid.style.setProperty('--category-icon-color',color);
  for(const button of $$('#categoryIconGrid button')){const selected=!emoji&&button.dataset.icon===chosen;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));}
  $('#categoryPreviewIcon').innerHTML=icon(chosen);$('#categoryPreviewIcon').style.color=color;
  $('#categoryPreviewName').textContent=$('#categoryName').value.trim()||translateUI('Sua categoria');$('#categoryColorValue').textContent=color.toUpperCase();$('#categoryColorSample').style.backgroundColor=color;$('#categoryColorPicker')?.colorPicker?.setColor(color);
  for(const button of $$('.category-color-choice'))button.setAttribute('aria-pressed',String(button.dataset.color===color));
}
function saveCategory(){
  const name=$('#categoryName').value.trim();if(!name){toast(translateUI('Dê um nome à categoria.'));return;}
  if(!$('#categoryColorPicker').colorPicker.validate())return;
  const emoji=$('#categoryEmoji').value.trim(),c={id:rt.editCategoryId||uid(),name,icon:emoji?'emoji:'+emoji:$('#categoryIconGrid').dataset.chosen,color:$('#categoryColor').value},index=state.categories.findIndex(x=>x.id===c.id),before=state.categories[index];
  if(index<0)state.categories.push(c);else state.categories[index]=c;
  if(!persist(true)){if(index<0)state.categories.pop();else state.categories[index]=before;return;}
  closeModal();render();toast(translateUI('Categoria salva.'));
}
function assignCategory(){openModal(translateUI('Escolher categoria'),markupUI`<p class="help">Escolha onde guardar esta preparação.</p><div class="sheet-options">${[category(''),...state.categories].map(c=>option('set-category',c.icon,c.name,active().categoryId===c.id?translateUI('Categoria atual'):'',`data-id="${esc(c.id)}"`,'',c.color)).join('')}</div>`);}
function schedule(id){if(id)rt.speechId=id;const s=active();if(!s)return;const value=s.scheduledAt?new Date(s.scheduledAt-new Date(s.scheduledAt).getTimezoneOffset()*60000).toISOString().slice(0,16):'';const offsets=s.reminders||[1440,60],preset=[10080,1440,180,60,30,10,0],labels=[translateUI('Uma semana antes'),translateUI('Um dia antes'),translateUI('3 horas antes'),translateUI('Uma hora antes'),translateUI('30 minutos antes'),translateUI('10 minutos antes'),translateUI('No horário agendado')];
  openModal(translateUI('Um compromisso com suas palavras'),markupUI`<p class="help">${esc(s.title)}</p><div class="stack"><div class="field"><label for="scheduleDate">Data e horário</label><input id="scheduleDate" type="datetime-local" value="${value}"></div><div class="field"><label>Quando lembrar?</label><div class="checkbox-list">${preset.map((n,i)=>markupUI`<label class="check-label"><input type="checkbox" name="reminder" value="${n}" ${offsets.includes(n)?'checked':''}>${labels[i]}</label>`).join('')}</div></div><div class="field"><label for="customReminders">Outros lembretes, em minutos antes</label><input id="customReminders" type="text" inputmode="numeric" placeholder="Ex.: 120; 2880" value="${offsets.filter(n=>!preset.includes(n)).join('; ')}"><small>Separe os valores por ponto e vírgula. Os lembretes são locais.</small></div></div>${native?markupUI`<div class="permission-note">${permissionSummary()}<div class="row wrap" style="margin-top:8px">${!rt.permissions.notifications?btn('notifications',translateUI('Permitir notificações'),'Bell','small link'):''}${!rt.permissions.exact?btn('exact-alarms',translateUI('Permitir precisão'),'Clock','small link'):''}</div></div>`:''}${s.scheduledAt?btn('clear-schedule',translateUI('Remover agendamento'),'X','link small','style="margin-top:15px"'):''}`,btn('save-schedule',translateUI('Salvar agendamento'),'CalendarDays'));
}
function saveSchedule(){const s=active();const value=$('#scheduleDate').value;if(!value){toast(translateUI('Escolha a data e o horário.'));return;}const timestamp=new Date(value).getTime();if(!Number.isFinite(timestamp)){toast(translateUI('Essa data não é válida.'));return;}const custom=$('#customReminders').value.split(/[;,]/).map(s=>s.trim()).filter(Boolean);if(custom.some(v=>!/^\d+$/.test(v)||Number(v)>525600)){toast(translateUI('Use valores em minutos, separados por ponto e vírgula.'));return;}s.scheduledAt=timestamp;s.reminders=[...new Set([...$$('input[name="reminder"]:checked').map(e=>Number(e.value)),...custom.map(Number)])].sort((a,b)=>b-a);persist(true);closeModal();if(native&&!rt.permissions.notifications&&s.reminders.length)native.requestNotifications();if(['editor','part'].includes(rt.view))refreshEditorMeta();else render();toast(s.reminders.length?translateUI('Agendamento salvo com lembretes.'):translateUI('Agendamento salvo sem lembretes.'));}
function refreshEditorMeta(){const s=active(),c=category(s.categoryId);if($('#editorCategory'))$('#editorCategory').textContent=c.name;const categorySymbol=$('#editorCategoryIcon');if(categorySymbol){categorySymbol.innerHTML=icon(c.icon);categorySymbol.style.color=c.color;}if($('#editorDuration'))$('#editorDuration').textContent=s.targetMinutes+translateUI(' minutos');const scheduleBtn=$('.editor-meta [data-action="schedule"]');if(scheduleBtn)scheduleBtn.innerHTML=icon('CalendarDays')+(s.scheduledAt?dateLabel(s.scheduledAt):translateUI('Agendar'));}
function duration(){const s=active();openModal(translateUI('Tempo de apresentação'),markupUI`<p class="help">O cronômetro muda de cor quando atingir esse tempo. Você pode continuar a contagem normalmente.</p><div class="field"><label for="durationMinutes">Duração prevista em minutos</label><input id="durationMinutes" type="number" min="1" max="240" value="${s.targetMinutes}"></div>`,btn('save-duration',translateUI('Salvar duração'),'Check'));}
function showFonts(){if(!rt.q)return;const r=scope(),fmt=rt.q.getFormat(r.index,r.length);openModal(translateUI('A forma das suas palavras'),markupUI`<p class="help">${scopeDescription()}</p><div class="stack"><div class="field"><label for="fontFamily">Fonte</label><select id="fontFamily">${Font.whitelist.map(f=>markupUI`<option value="${f}" ${fmt.font===f?'selected':''}>${f}</option>`).join('')}</select></div><div class="field"><label for="fontSize">Tamanho da letra</label><select id="fontSize"><option value="">Padrão do editor</option>${Size.whitelist.map(f=>markupUI`<option value="${f}" ${fmt.size===f?'selected':''}>${f.replace('px',' px')}</option>`).join('')}</select></div><div class="field"><label for="headingStyle">Estilo de parágrafo</label><select id="headingStyle"><option value="0">Texto normal</option>${[1,2,3].map(n=>markupUI`<option value="${n}" ${fmt.header===n?'selected':''}>Título ${n}</option>`).join('')}</select></div></div>`,btn('apply-font',translateUI('Aplicar ao texto'),'Check'));}
function showColors(){if(!rt.q)return;const r=scope(),fmt=rt.q.getFormat(r.index,r.length);const swatches=['#203d3a','#234c48','#9c6945','#a34943','#335d84','#764f8a','#6b7f40','#111111'];openModal(translateUI('Cor e destaque'),markupUI`<p class="help">${scopeDescription()}</p><div class="stack"><div class="field"><label>Cor da escrita</label><div class="swatches">${swatches.map(c=>markupUI`<button type="button" class="swatch" style="--swatch:${c}" data-action="swatch" data-color="${c}" aria-label="Cor ${c}"></button>`).join('')}</div><input id="textColor" type="color" value="${/^#[\da-f]{6}$/i.test(fmt.color)?fmt.color:'#203d3a'}"></div><div class="field"><label for="highlightColor">Cor do marca-texto</label><input id="highlightColor" type="color" value="${/^#[\da-f]{6}$/i.test(fmt.background)?fmt.background:'#f8e4a1'}"></div><div class="row">${btn('apply-color',translateUI('Cor da escrita'),'Type','secondary')}${btn('apply-highlight',translateUI('Destacar'),'Highlighter')}</div>${btn('clear-highlight',translateUI('Remover marca-texto'),'X','soft small')}</div>`);}
function moreFormat(){if(!rt.q)return;const f=(name,label,action,extra='')=>markupUI`<button type="button" class="format-cell" data-action="${action}" ${extra}>${icon(name)}<span>${label}</span></button>`;openModal(translateUI('Todas as ferramentas'),markupUI`<p class="help">${scopeDescription()}</p><div class="format-grid">${f('Bold',translateUI('Negrito'),'format','data-format="bold"')}${f('Italic',translateUI('Itálico'),'format','data-format="italic"')}${f('Underline',translateUI('Sublinhado'),'format','data-format="underline"')}${f('Strikethrough',translateUI('Tachado'),'format','data-format="strike"')}${f('ListOrdered','1, 2, 3','list','data-value="ordered"')}${f('ListOrdered','1º, 2º, 3º','ordinal-list')}${f('List',translateUI('Bolinhas'),'list','data-value="bullet"')}${f('ListChecks',translateUI('Checklist'),'list','data-value="unchecked"')}${f('Quote',translateUI('Citação'),'block-quote')}${f('AlignLeft',translateUI('À esquerda'),'align','data-value=""')}${f('AlignCenter',translateUI('Centralizar'),'align','data-value="center"')}${f('AlignJustify',translateUI('Justificar'),'align','data-value="justify"')}${f('CaseUpper',translateUI('MAIÚSCULAS'),'upper')}${f('CaseLower',translateUI('minúsculas'),'lower')}${f('Type',translateUI('Fontes'),'font')}${f('Highlighter',translateUI('Cores'),'colors')}${f('Link2',translateUI('Inserir link'),'link')}${f('Unlink',translateUI('Tirar link'),'remove-link')}${f('FilePlus2',translateUI('Nova página'),'page-break')}${f('PenLine',translateUI('Anotação privada'),'note-add')}${f('X',translateUI('Limpar estilo'),'clear-format')}</div>`);}
function clearFormatting(){const r=scope();rt.q.history.cutoff();checkpoint(translateUI('Antes de limpar formatação'));const attrs={};for(const name of CLEAR_STYLE_FORMATS)attrs[name]=null;rt.q.updateContents(new Delta().retain(r.index).retain(r.length,attrs),'user');for(const name of ['header','list','blockquote','align','speech-kind','ordinal'])rt.q.formatLine(r.index,Math.max(1,r.length),name,false,'user');rt.q.history.cutoff();closeModal();persist(true);updateScope();toast(translateUI('Formatação removida.'));}
async function openPaste(){rt.paste={text:'',html:''};try{if(native)rt.paste=JSON.parse(native.clipboard());else rt.paste.text=await navigator.clipboard.readText();}catch(e){}openModal(translateUI('Suas palavras, do seu jeito'),markupUI`<p class="help">O texto é inserido no cursor e substitui apenas o trecho selecionado.</p><div class="field"><label for="pasteText">Texto copiado</label><textarea id="pasteText" rows="5" placeholder="Cole seu texto aqui se ele não aparecer automaticamente…">${esc(rt.paste.text||'')}</textarea></div><div class="sheet-options" style="margin-top:15px">${option('do-paste','ClipboardPaste',translateUI('Colar com formatação'),translateUI('Mantém os estilos disponibilizados pelo aplicativo de origem.'),'data-mode="rich"')}${option('do-paste','FileText',translateUI('Colar sem formatação'),translateUI('Somente as palavras, sem cores ou estilos.'),'data-mode="plain"')}${option('do-paste','Sparkles',translateUI('Interpretar Markdown'),translateUI('Transforma **negrito**, títulos e listas em formatação.'),'data-mode="markdown"')}</div>`);}
function pasteContent(mode){if(!rt.q)return;const text=$('#pasteText').value;const html=mode==='rich'&&text===rt.paste.text?rt.paste.html:'';let delta;if(mode==='markdown')delta=deltaFromHTML(marked.parse(text,{async:false}),false);else if(html)delta=deltaFromHTML(html,false);else delta=new Delta().insert(text);checkpoint(translateUI('Antes de colar'));const r=rt.selection||{index:Math.max(0,rt.q.getLength()-1),length:0};const at=Math.min(r.index,rt.q.getLength()-1);rt.q.updateContents(new Delta().retain(at).delete(Math.min(r.length,rt.q.getLength()-1-at)).concat(new Delta(delta.ops)),'user');rt.q.setSelection(at+new Delta(delta.ops).length(),0,'silent');rt.selection={index:at+new Delta(delta.ops).length(),length:0};rt.q.history.cutoff();closeModal();persist(true);toast(mode==='plain'?translateUI('Texto colado sem formatação.'):translateUI('Texto inserido.'));}
function pagesMenu(){openModal(translateUI('Páginas e leitura'),markupUI`<p class="help">Você pode escrever tudo em uma página contínua ou inserir quebras e apresentar uma página por vez.</p><div class="sheet-options">${option('set-layout','WrapText',translateUI('Página contínua'),translateUI('Leitura por rolagem, como no seu exemplo.'),'data-layout="flow"')}${option('set-layout','FileText',translateUI('Páginas separadas'),translateUI('Navegue entre as páginas ao apresentar.'),'data-layout="pages"')}${rt.q?option('page-break','FilePlus2',translateUI('Inserir quebra de página'),translateUI('A nova página começa na posição do cursor.')):''}</div>`);}
function insertPageBreak(){if(!rt.q)return;checkpoint(translateUI('Antes de inserir página'));const r=rt.selection||{index:rt.q.getLength()-1,length:0},at=Math.min(r.index,rt.q.getLength()-1);rt.q.insertEmbed(at,'pagebreak',true,'user');rt.q.insertText(at+1,'\n','user');rt.q.setSelection(at+2,0,'silent');rt.selection={index:at+2,length:0};rt.q.history.cutoff();persist(true);closeModal();toast(translateUI('Nova página inserida.'));}
function readingSettings(){const s=active(),r=s.read;openModal(translateUI('Conforto para apresentar'),markupUI`<div class="stack"><div class="field"><div class="range-line"><label for="readSize">Tamanho da letra</label><output id="readSizeValue">${r.fontSize} px</output></div><input id="readSize" type="range" min="16" max="54" value="${r.fontSize}"></div><div class="field"><div class="range-line"><label for="readZoom">Zoom do texto</label><output id="readZoomValue">${r.zoom}%</output></div><input id="readZoom" type="range" min="75" max="160" step="5" value="${r.zoom}"></div><div class="field"><div class="range-line"><label for="readLine">Espaço entre linhas</label><output id="readLineValue">${r.line.toFixed(1)}</output></div><input id="readLine" type="range" min="1.2" max="2.3" step=".1" value="${r.line}"></div><div class="field"><label for="readFont">Fonte de leitura</label><select id="readFont"><option value="">Fontes originais do texto</option>${['Inter','Lora','Arial','Georgia','Verdana','Times New Roman','monospace'].map(f=>markupUI`<option value="${f}" ${f===r.font?'selected':''}>${f}</option>`).join('')}</select></div><label class="check-label"><input id="readHighlights" type="checkbox" ${r.highlights?'checked':''}>Mostrar os destaques do texto</label>${notesUI.readingOptions()}<div class="row wrap">${btn('theme',state.settings.theme==='dark'?translateUI('Tema claro'):translateUI('Tema escuro'),state.settings.theme==='dark'?'Sun':'Moon','secondary small')}${btn('reader-pages',s.layout==='pages'?translateUI('Leitura contínua'):translateUI('Ler por páginas'),'FileText','secondary small')}</div></div>`,btn('close-modal',translateUI('Continuar leitura'),'Check'));
  for(const [id,key,suffix] of [['readSize','fontSize',' px'],['readZoom','zoom','%'],['readLine','line','']])$('#'+id).addEventListener('input',e=>{r[key]=Number(e.target.value);$('#'+id+'Value').textContent=(key==='line'?r[key].toFixed(1):r[key])+suffix;applyReadSettings();persist();});
  $('#showPresenterNotes')?.addEventListener('change',e=>notesUI.setReaderVisibility(e.target.checked));
  $('#readFont').addEventListener('change',e=>{r.font=e.target.value;applyReadSettings();persist();});$('#readHighlights').addEventListener('change',e=>{r.highlights=e.target.checked;applyReadSettings();persist();});
}

function quoteRanges(text,range){
  const result=quotationSpans(text).map(span=>({start:span.offset,end:span.offset+span.length,block:span.block}));
  if(rt.q&&range)for(const line of rt.q.getLines(range.index,range.length)){
    // Block embeds, including page breaks, have no paragraph formats.
    const formats=line.formats()||{};if(!formats.blockquote&&formats['speech-kind']!=='scripture')continue;
    const at=rt.q.getIndex(line),start=Math.max(at,range.index),end=Math.min(at+line.length()-1,range.index+range.length);
    if(end>start)result.push({start:start-range.index,end:end-range.index,block:true});
  }
  return result;
}
// Keep one newline per page break so worker offsets match Quill positions.
function beginReview(){if(!rt.q)return;const r=scope(),text=plain(rt.q.getContents(r.index,r.length));if(!text.trim()){toast(translateUI('Escreva ou cole seu discurso antes de revisar.'));return;}
  const token=uid();rt.review={token,range:r,text,baseline:JSON.stringify(rt.q.getContents()),matches:[],loading:true,remote:!!(native&&state.settings.onlineReview),remoteDone:false,engine:translateUI('Preparando o dicionário local…'),quotes:quoteRanges(text,r),protect:true,highlight:true};renderReview();rt.q.blur();
  try{if(!worker){worker=new Worker('review-worker.js');worker.onmessage=e=>{const review=rt.review;if(!review||e.data.token!==review.token)return;review.loading=false;review.engine=e.data.engine;review.local=e.data.matches;mergeReviewMatches();if(rt.modal==='review')renderReview();};worker.onerror=()=>{const review=rt.review;if(!review)return;review.loading=false;review.engine=translateUI('Regras locais');review.local=[...rememberedMatches(review.text,state.vocabulary),...localRuleMatches(review.text).filter(m=>!dictionaryWords(state.vocabulary).some(word=>word.toLocaleLowerCase('pt-BR')===m.word.toLocaleLowerCase('pt-BR')))];mergeReviewMatches();if(rt.modal==='review')renderReview();};}worker.postMessage({token,text,vocabulary:state.vocabulary});}
  catch(e){rt.review.loading=false;rt.review.engine=translateUI('Regras locais');rt.review.local=[...rememberedMatches(text,state.vocabulary),...localRuleMatches(text).filter(m=>!dictionaryWords(state.vocabulary).some(word=>word.toLocaleLowerCase('pt-BR')===m.word.toLocaleLowerCase('pt-BR')))];mergeReviewMatches();renderReview();}
  if(rt.review.remote)native.proofread(text,token,state.settings.reviewEndpoint);
}
function mergeReviewMatches(){const r=rt.review;if(!r)return;const previous=new Map(r.matches.map(m=>[m.offset+':'+m.length,m]));const all=[...(r.local||[]),...(r.remoteMatches||[])];const seen=new Set();r.matches=all.filter(m=>{const key=m.offset+':'+m.length;if(seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>a.offset-b.offset).map(m=>({...m,chosen:previous.get(m.offset+':'+m.length)?.chosen??m.replacements[0]??'',customOpen:previous.get(m.offset+':'+m.length)?.customOpen||false,customValue:previous.get(m.offset+':'+m.length)?.customValue||'',rememberCustom:previous.get(m.offset+':'+m.length)?.rememberCustom||false,protected:r.quotes.some(q=>m.offset>=q.start&&m.offset+m.length<=q.end),selected:previous.has(m.offset+':'+m.length)?previous.get(m.offset+':'+m.length).selected:!!m.safe&&!r.quotes.some(q=>m.offset>=q.start&&m.offset+m.length<=q.end)}));}
function renderReview(){const r=rt.review;if(!r)return;
  const cards=r.matches.map((m,i)=>{const start=Math.max(0,m.offset-38),end=Math.min(r.text.length,m.offset+m.length+38);return markupUI`<article class="review-card"><div class="review-context">${esc(r.text.slice(start,m.offset))}<del>${esc(r.text.slice(m.offset,m.offset+m.length))}</del>${m.chosen?markupUI` → <ins>${esc(m.chosen)}</ins>`:''}${esc(r.text.slice(m.offset+m.length,end))}</div><p class="review-message">${esc(systemMessage(m.message))}${m.protected?translateUI(' · Dentro de uma citação.'):''}</p><div class="suggestion-row">${m.replacements.map((v,j)=>markupUI`<button type="button" class="suggestion ${m.chosen===v?'active':''}" data-action="review-choice" data-index="${i}" data-choice="${j}">${esc(v||translateUI('(remover)'))}</button>`).join('')}<button type="button" class="suggestion" data-action="review-custom" data-index="${i}">Escrever minha correção</button>${/^[\p{L}\p{M}-]+$/u.test(m.word||'')?markupUI`<button type="button" class="suggestion" data-action="learn-word" data-index="${i}">Adicionar ao dicionário</button>`:''}</div>${m.customOpen?markupUI`<div class="review-custom-controls"><div class="field"><label for="customCorrection${i}">Minha correção</label><input type="text" id="customCorrection${i}" data-custom-correction="${i}" maxlength="1000" value="${esc(m.customValue)}" autocomplete="off"></div><label class="check-label"><input type="checkbox" data-remember-correction="${i}" ${m.rememberCustom?'checked':''}>Lembrar esta correção</label><button type="button" class="btn small secondary" data-action="apply-custom-review" data-index="${i}" ${r.protect&&m.protected?'disabled':''}>Aplicar nesta ocorrência</button></div>`:''}<label class="check-label" style="margin-top:9px"><input type="checkbox" data-review-index="${i}" ${m.selected?'checked':''} ${r.protect&&m.protected||!m.replacements.length?'disabled':''}>Aplicar esta correção</label></article>`;}).join('');
  openModal(translateUI('Cuidar das suas palavras'),markupUI`<p class="help">${r.range.length&&rt.selection.length?translateUI('Somente o trecho selecionado.'):isPart(active())?translateUI('Revisão da parte inteira.'):translateUI('Revisão do discurso inteiro.')} Acentuação e grafia são verificadas localmente; concordância e contexto podem precisar da revisão online.</p><div class="progress-note">${icon(r.loading?'Clock':'SpellCheck')}<span>${esc(systemMessage(r.engine))}${r.remote?` · ${r.remoteDone?translateUI('LanguageTool consultado'):translateUI('Consultando LanguageTool…')}`:''}</span></div>${r.remoteError?markupUI`<p class="notice">${esc(systemMessage(r.remoteError))} A revisão local permanece disponível.</p>`:''}<label class="check-label"><input id="protectQuotes" type="checkbox" ${r.protect?'checked':''}>Preservar o texto dentro de citações</label><label class="check-label"><input id="reviewHighlights" type="checkbox" ${r.highlight?'checked':''}>Analisar citações e destaques após corrigir</label><div class="review-header"><span>${r.loading?translateUI('Analisando o texto…'):formatUI`${r.matches.length} sugestões encontradas`}</span><button type="button" class="btn link small" data-action="review-select-safe">Selecionar correções seguras</button></div><div id="reviewCards">${cards||(!r.loading?markupUI`<div class="empty" style="padding:22px">${icon('CheckCircle2')}<h3>Nenhuma sugestão nesta revisão</h3><p>Você ainda pode analisar a formatação do conteúdo.</p></div>`:'')}</div><p class="notice" style="margin-top:13px">Após as correções o modelo local analisará o conteúdo e mostrará uma prévia das citações, do negrito e do marca-texto.</p>`,btn('apply-review',translateUI('Aplicar selecionadas'),'Check','',r.loading?'disabled':''),true);rt.modal='review';
  $('#protectQuotes').addEventListener('change',e=>{r.protect=e.target.checked;if(r.protect)for(const m of r.matches)if(m.protected)m.selected=false;renderReview();});$('#reviewHighlights').addEventListener('change',e=>{r.highlight=e.target.checked;});$$('[data-review-index]').forEach(el=>el.addEventListener('change',()=>{r.matches[Number(el.dataset.reviewIndex)].selected=el.checked;}));$$('[data-custom-correction]').forEach(el=>el.addEventListener('input',()=>{r.matches[Number(el.dataset.customCorrection)].customValue=el.value;}));$$('[data-remember-correction]').forEach(el=>el.addEventListener('change',()=>{r.matches[Number(el.dataset.rememberCorrection)].rememberCustom=el.checked;}));
}
function replaceStyled(q,at,length,replacement){q.updateContents(new Delta().retain(at).delete(length).concat(styledInsertion(q,at,length,replacement,Delta)),'user');}
function applyReview(){const r=rt.review;if(!r||!rt.q)return;if(JSON.stringify(rt.q.getContents())!==r.baseline){toast(translateUI('O texto mudou. Execute a revisão novamente.'));closeModal();return;}
  let nextVocabulary=state.vocabulary;try{for(const m of r.matches)if(m.selected&&!(r.protect&&m.protected)&&m.rememberCustom&&m.customValue===m.chosen)nextVocabulary=rememberCorrection(nextVocabulary,m.word,m.chosen);}catch(error){toast(translateUI(error.message));return;}
  checkpoint(translateUI('Antes da revisão de português'));rt.q.history.cutoff();let applied=0,diff=0,last=Infinity;
  for(const m of r.matches.filter(m=>m.selected&&!(r.protect&&m.protected)).sort((a,b)=>b.offset-a.offset)){
    if(m.offset+m.length>last)continue;const at=r.range.index+m.offset;
    const source=rt.q.getContents(at,m.length);
    if(source.ops.some(op=>typeof op.insert!=='string')||plain(source)!==r.text.slice(m.offset,m.offset+m.length))continue;
    replaceStyled(rt.q,at,m.length,m.chosen);last=m.offset;diff+=m.chosen.length-m.length;applied++;
  }
  const length=r.range.length+diff;if(rt.selection.length)rt.selection={index:r.range.index,length};
  rt.q.history.cutoff();state.vocabulary=nextVocabulary;persist(true);closeModal();updateScope();toast(`${applied} ${applied===1?translateUI('correção aplicada'):translateUI('correções aplicadas')}.`);
  if(r.highlight)showAutoHighlights();
}
function showAutoHighlights(){
  if(!rt.q)return;
  const range=scope(),text=plain(rt.q.getContents(range.index,range.length));if(!text.trim()){toast(translateUI('Escreva um texto antes de analisar.'));return;}
  const token=uid();rt.highlightPreview={token,range,text,spans:[],loading:true,destination:'current',versionName:translateUI('Versão formatada'),baseline:JSON.stringify(rt.q.getContents())};
  openModal(isPart(active())?translateUI('Analisando sua parte'):translateUI('Analisando seu discurso'),markupUI`<p class="help">${scopeDescription()} A análise lê todas as frases e compara as ideias de cada seção com o tema geral. O texto permanece no aparelho.</p><div class="progress-note">${icon('Sparkles')}<span id="semanticStatus" role="status">Preparando a análise do conteúdo…</span></div><p class="notice">Na primeira análise o modelo precisa ser carregado. Você verá os trechos sugeridos antes de aplicar.</p>`,'',true);rt.modal='semantic';rt.q.blur();
  try{
    if(!semanticWorker){
      semanticWorker=new Worker('semantic-worker.js');
      semanticWorker.onmessage=event=>{
        const preview=rt.highlightPreview,data=event.data;if(!preview||preview.token!==data.token)return;
        if(data.status==='progress'){const status=$('#semanticStatus');if(status&&rt.modal==='semantic')status.textContent=systemMessage(data.message)+(Number.isFinite(data.progress)?' · '+data.progress+'%':'');return;}
        preview.loading=false;
        if(data.status==='error'){preview.error=data.message;if(rt.modal==='semantic')renderSemanticError(data.message);return;}
        preview.spans=data.spans.map(span=>{if(span.type==='quote'&&span.block&&rt.q){const full=plain(rt.q.getContents()),at=preview.range.index+span.offset,start=full.lastIndexOf('\n',at-1)+1,next=full.indexOf('\n',at+span.length),end=next<0?full.length:next;span.block=!full.slice(start,at).trim()&&!full.slice(at+span.length,end).trim();}return {...span,selected:true};});preview.engine=data.engine;preview.sentences=data.sentences;preview.coverage=data.coverage;
        if(rt.modal==='semantic'){
          if(!rt.q||JSON.stringify(rt.q.getContents())!==preview.baseline){renderSemanticError(translateUI('O texto mudou durante a análise. Analise novamente para usar a versão atual.'));return;}
          renderSemanticPreview();
        }
      };
      semanticWorker.onerror=()=>{if(rt.highlightPreview)rt.highlightPreview.loading=false;if(rt.modal==='semantic')renderSemanticError(translateUI('A análise do conteúdo não pôde ser iniciada. Confira se o Android System WebView está atualizado.'));semanticWorker.terminate();semanticWorker=null;};
    }
    semanticWorker.postMessage({token,text,title:isDefaultTitle(active().title)?'':active().title,contextText:rt.selection.length?plain(rt.q.getContents()):'',participantNames:isPart(active())?active().participants.map(person=>person.name):[]});
  }catch(error){rt.highlightPreview.loading=false;renderSemanticError(translateUI('Não foi possível iniciar a análise do conteúdo. ')+systemMessage(error.message));}
}
function renderSemanticError(message){openModal(translateUI('Análise não concluída'),markupUI`<p class="help">${esc(systemMessage(message))}</p><p class="notice">Nenhuma formatação foi aplicada.</p>`,btn('auto-format',translateUI('Tentar novamente'),'RotateCcw'),true);rt.modal='semantic-error';}
function renderSemanticPreview(){
  const preview=rt.highlightPreview,labels={central:translateUI('MARCA-TEXTO · IDEIA CENTRAL'),key:translateUI('NEGRITO · PALAVRA-CHAVE'),quote:translateUI('CITAÇÃO'),reference:translateUI('REFERÊNCIA')};
  openModal(translateUI('Formatação sugerida'),markupUI`<fieldset class="format-destination"><legend>Onde aplicar a formatação?</legend><label class="check-label"><input type="radio" name="formatDestination" value="current" checked>Nesta versão</label><label class="check-label"><input type="radio" name="formatDestination" value="new">Criar uma nova versão</label><div class="field" id="formatVersionNameField" hidden><label for="formatVersionName">Nome da versão</label><input type="text" id="formatVersionName" maxlength="80" value="${esc(preview.versionName)}"></div></fieldset><div class="stack">${preview.spans.map((span,i)=>markupUI`<label class="review-card" style="margin:0"><span class="badge">${labels[span.type]}</span><div class="review-context" style="margin-top:9px">${esc(span.text)}</div>${span.context&&span.context!==span.text?markupUI`<p class="review-message">No trecho: ${esc(span.context)}</p>`:''}${span.explanation?markupUI`<p class="review-message">${esc(systemMessage(span.explanation))}</p>`:''}<span class="check-label"><input type="checkbox" data-highlight-index="${i}" checked>${span.type==='quote'?(span.block?translateUI('Formatar como citação'):translateUI('Destacar citação em itálico')):translateUI('Aplicar ')+(span.type==='central'?translateUI('marca-texto'):translateUI('negrito'))}</span></label>`).join('')||htmlUI('<p class="notice">Não foram encontrados trechos suficientes para sugerir uma formatação.</p>')}</div>`,btn('apply-auto-highlights',translateUI('Aplicar formatação'),'Check','',!preview.spans.length?'disabled':''),true);rt.modal='semantic-preview';$$('input[name="formatDestination"]').forEach(input=>input.addEventListener('change',()=>{preview.destination=input.value;$('#formatVersionNameField').hidden=input.value!=='new';}));$('#formatVersionName').addEventListener('input',event=>{preview.versionName=event.target.value;});
}
function applySemanticFormatting(){
 const preview=rt.highlightPreview;if(!preview||preview.loading||!rt.q)return;
 if(JSON.stringify(rt.q.getContents())!==preview.baseline){closeModal();toast(translateUI('O texto mudou. Analise o conteúdo novamente.'));return;}
 const spans=$$('[data-highlight-index]:checked').map(input=>preview.spans[Number(input.dataset.highlightIndex)]),result=semanticEdit(rt.q.getContents(),preview.range,spans,Delta);
 if(!result.applied){toast(translateUI('Selecione uma sugestão de formatação.'));return;}
 if(preview.destination==='new'){
  const name=preview.versionName.trim().slice(0,80);if(!name){toast(translateUI('Dê um nome à versão.'));$('#formatVersionName').focus();return;}
  try{if(commitVersionChange(doc=>{formatNewVersion(doc,name,result.edit,Delta);doc.updatedAt=Date.now();}))toast(translateUI('Versão criada com a formatação selecionada.'));}catch(error){toast(systemMessage(error.message));}return;
 }
 checkpoint(translateUI('Antes da formatação por análise semântica'));rt.q.history.cutoff();rt.q.updateContents(result.edit,'user');rt.q.history.cutoff();persist(true);closeModal();toast(`${result.applied} ${result.applied===1?translateUI('formatação aplicada'):translateUI('formatações aplicadas')}.`);
}
function history(versionId){
 const s=active();if(!s||persist(true)===false)return;const v=s.versions.find(v=>v.id===versionId)||activeContentVersion(s),current=v.id===s.activeVersionId;
 openModal(translateUI('Ensaios e restauração'),markupUI`<p class="help">${esc(s.title)} · <strong>${esc(v.name)}</strong></p><div class="section-head"><h3>Ensaios desta versão</h3><span>${v.rehearsals.length} registros</span></div>${v.rehearsals.slice().reverse().map(r=>markupUI`<div class="history-item">${icon('Timer')}<div><strong>${clock(r.duration)}</strong><small>${dateLabel(r.at,{day:'2-digit',month:'short',year:'numeric'})} · ${timeLabel(r.at)}<br>${esc(rehearsalContentLabel(r,v))}</small></div><span class="badge">${r.duration>s.targetMinutes*60000?translateUI('Acima do previsto'):translateUI('Dentro do tempo')}</span></div>`).join('')||htmlUI('<p class="notice">Encerre um ensaio no modo de apresentação para guardar seu tempo nesta versão.</p>')}<div class="divider"></div><div class="section-head"><h3>Histórico de restauração</h3><span>${v.history.length} cópias</span></div><p class="notice">Recupera textos anteriores desta versão. As versões alternativas continuam independentes.</p>${v.history.slice().reverse().map(h=>markupUI`<div class="history-item">${icon('History')}<div><strong>${esc(h.label||translateUI('Texto anterior'))}</strong><small>${dateLabel(h.at)} · ${timeLabel(h.at)} · ${words(plain(h.delta))} palavras</small></div>${current?btn('restore-version',translateUI('Restaurar'),'','secondary small',`data-id="${esc(h.id)}"`):''}</div>`).join('')||htmlUI('<p class="notice">As cópias são guardadas antes das revisões e alterações de formatação.</p>')}${!current&&v.history.length?htmlUI('<p class="notice">Selecione esta versão no editor para restaurar uma cópia.</p>'):''}`);
}
function commitNoteChange(label,change){
 if(!rt.q||persist(true)===false)return false;
 const s=active(),q=rt.q,before=clone(s),delta=q.getContents(),selection=clone(rt.selection);
 const stack=q.history.stack,undo=stack.undo.slice(),redo=stack.redo.slice(),lastRecorded=q.history.lastRecorded;
 const rollback=()=>{
  for(const key of Object.keys(s))delete s[key];Object.assign(s,before);projectContentVersion(s);
  q.setContents(delta,'silent');stack.undo=undo;stack.redo=redo;q.history.lastRecorded=lastRecorded;
  rt.selection=selection;retainEditorDraft(state,confirmedDocument(),s);
  updateEditorStats();updateScope();updateEditorSaveButton();notesUI.refreshEditor();
 };
 try{checkpoint(label);q.history.cutoff();change(s,q);s.updatedAt=Date.now();captureContentVersion(s);q.history.cutoff();if(persist(true)===false){rollback();return false;}}
 catch(error){rollback();throw error;}
 updateEditorSaveButton();return true;
}
function commitVersionChange(change){
 if(persist(true)===false)return false;const s=active(),before=clone(s),oldQ=rt.q,focused=rt.focus,confirmed=confirmedDocument(),confirmedBefore=rt.view==='editor'?clone(confirmed):null;
 const rollback=()=>{for(const key of Object.keys(s))delete s[key];Object.assign(s,before);projectContentVersion(s);rt.q=oldQ;if(confirmedBefore){for(const key of Object.keys(confirmed))delete confirmed[key];Object.assign(confirmed,confirmedBefore);projectContentVersion(confirmed);retainEditorDraft(state,confirmed,s);}updateEditorSaveButton();};
 rt.q=null;
 try{change(s);if(rt.view==='editor')syncEditorVersionRuntime(confirmed,before,s);if(persist(true)===false){rollback();return false;}}catch(error){rollback();throw error;}
 const changed=s.activeVersionId!==before.activeVersionId||activeContentVersion(s).contentKey!==activeContentVersion(before).contentKey;
 if(changed&&rt.audio.speechId===s.id){pauseAudio();rt.audio={state:'idle',offset:0,end:0,text:'',speechId:null};}
 rt.review=null;rt.highlightPreview=null;rt.page=0;rt.selection={index:0,length:0};closeModal();render();if(focused&&rt.view==='reader'){rt.focus=false;toggleFocus();}return true;
}
function restoreContentHistory(id){
 const s=active(),snapshot=s?.history.find(v=>v.id===id);if(!snapshot)return;const saved=clone(snapshot);
 if(commitVersionChange(doc=>{checkpoint(translateUI('Antes de restaurar texto'));doc.delta=clone(saved.delta);doc.presenterNotes=clone(saved.presenterNotes||[]);if(isPart(doc)&&saved.type==='part'){doc.partFormat=2;doc.participants=clone(saved.participants);doc.myParticipantId=saved.myParticipantId||'';delete doc.turns;}doc.updatedAt=Date.now();captureContentVersion(doc);}))toast(translateUI('Texto restaurado nesta versão. A cópia anterior permanece no histórico.'));
}
function loadVoices(event){voicePicker.load(event);}
function audioSettings(){
  loadVoices();openModal(translateUI('Ouça suas palavras'),markupUI`<p class="help">Use a leitura para revisar o texto e ensaiar. O cronômetro mede sua apresentação de forma independente.</p><div class="stack"><div class="field"><label for="voiceName">Voz de leitura</label><select id="voiceName"></select><small id="voiceAvailability" role="status" aria-live="polite" hidden></small>${btn('refresh-voices',translateUI('Atualizar vozes'),'RotateCcw','small link','hidden')}</div><div class="field"><div class="range-line"><label for="voiceRate">Velocidade</label><output id="voiceRateValue">${Number(state.settings.rate).toFixed(1)}×</output></div><input id="voiceRate" type="range" min=".5" max="1.8" step=".1" value="${state.settings.rate}"></div><div class="field audio-preview-field"><label for="voicePreviewText">Texto para testar a voz</label><textarea id="voicePreviewText" rows="3" maxlength="2000"></textarea><small>Use a frase de exemplo ou escreva um texto. O teste não altera seus discursos.</small></div>${btn('test-voice',translateUI('Testar voz'),'Play','soft')}${btn('install-voices',translateUI('Instalar ou gerenciar vozes'),'Download','secondary')}</div>`,btn('save-audio',translateUI('Salvar ajustes'),'Check'));
  rt.modal='audio-settings';voicePicker.mount();
}
function saveAudio(){
  const previous={audioLanguage:state.settings.audioLanguage,voice:state.settings.voice,rate:state.settings.rate},draft=voicePicker.draft();
  state.settings.audioLanguage=draft.audioLanguage;state.settings.voice=draft.voice;state.settings.rate=Number($('#voiceRate').value);
  if(persist(true)===false){Object.assign(state.settings,previous);return false;}
  if(rt.audio.state==='playing'&&Object.keys(previous).some(key=>previous[key]!==state.settings[key]))pauseAudio();
  closeModal();toast(translateUI('Ajustes de áudio salvos.'));return true;
}
function testVoice(){
  const draft=voicePicker.draft(),previewSettings={...state.settings,...draft,rate:Number($('#voiceRate').value)};
  const text=$('#voicePreviewText')?.value.trim()||voiceSample(audioLocale(previewSettings));
  audioPlayer.preview(text,previewSettings);
}
function speak(){const s=active();if(!s)return;syncCurrent();const text=isPart(s)?partNarration(s):plain(s.delta);if(!text.trim()){toast(translateUI('Escreva uma fala ou um texto antes de ouvir.'));return;}audioPlayer.read({id:s.id,versionId:s.activeVersionId,title:s.title,text});}
function pauseAudio(){audioPlayer.pause();}
function updateAudioButtons(){audioPlayer?.update();}
function markAudioParagraph(){if(rt.view!=='reader'||rt.audio.speechId!==rt.speechId)return;if(isPart(active())){for(const node of $$('#readerText .reading-turn'))node.classList.toggle('is-speaking',rt.audio.state==='playing'&&rt.audio.offset>=Number(node.dataset.audioStart)&&rt.audio.offset<Number(node.dataset.audioEnd));return;}let offset=0;for(const node of [...($('#readerText')?.children||[])]){if(node.classList.contains('presenter-inline-notes'))continue;const len=Number(node.dataset.narrationLength)||node.textContent.length+1;node.classList.toggle('is-speaking',rt.audio.state==='playing'&&rt.audio.offset>=offset&&rt.audio.offset<offset+len);offset+=len;}}
function exportFile(name,mime,text){if(native){native.exportFile(name,mime,text);return;}const blob=new Blob([text],{type:mime+';charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(translateUI('Arquivo exportado.'));}
function filename(suffix){return(active()?.title||translateUI('discurso')).replace(/[\\/:*?"<>|]/g,'-').slice(0,100)+suffix;}
function exportSpeech(){syncCurrent();openModal(translateUI('Leve suas palavras'),markupUI`<p class="help">${esc(active().title)}</p><div class="sheet-options">${option('export-format','BookOpen',translateUI('Arquivo do SePrepare'),isPart(active())?translateUI('Guarda participantes, falas, formatação e ajustes de leitura.'):translateUI('Guarda texto, formatação e ajustes de leitura.'),'data-format="orador"')}${option('export-format','FileText',translateUI('HTML formatado'),translateUI('Abra a preparação em um navegador.'),'data-format="html"')}${option('export-format','Type',translateUI('Texto simples'),translateUI('Texto com os nomes dos participantes nas partes.'),'data-format="txt"')}</div>`);}
function doExportSpeech(type){syncCurrent();const s=active();if(type==='orador')exportFile(shareFilename(s.title),SPEECH_MIME,encodeSpeech(s));else if(type==='txt')exportFile(filename('.txt'),'text/plain',messageText(s));else exportFile(filename('.html'),'text/html',markupUI`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(s.title)}</title><style>body{margin:0;background:#f8f5ef;color:#203d3a;font:22px/1.7 Arial,sans-serif}main{max-width:850px;margin:auto;padding:35px 24px 90px}h1{font:600 35px/1.25 Georgia,serif}small{color:#747b70}article{margin-top:35px}p{margin:0 0 1em}blockquote,.ql-speech-scripture,.ql-speech-question{background:#edf0e8;border-left:3px solid #638375;padding:.6em .8em;margin:1em 0}hr{border:0;border-top:1px solid #dce1d6;margin:2em 0}.ql-align-center{text-align:center}.ql-align-right{text-align:right}.ql-align-justify{text-align:justify}.reading-turn{border-left:3px solid #dce1d6;padding-left:16px;margin:28px 0}.speaker-label{font-size:14px;font-weight:bold;color:#9c6945;margin-bottom:12px}@media print{body{background:white;font-size:16px}main{padding:0}hr{break-after:page}}</style><main><h1>${esc(s.title)}</h1><small>${esc(s.subtitle)}</small><article>${documentHTML(s,'')}</article></main></html>`);closeModal();}
function importFile(){if(native){native.importFile();return;}const input=document.createElement('input');input.type='file';input.accept='.seprepare,.orador,.json,.html,.htm,.txt,.md';input.onchange=async()=>{const file=input.files?.[0];if(file)handleImport(file.name,await file.text());};input.click();}
function shareSpeech(id){
  syncCurrent();const speech=state.speeches.find(item=>item.id===(id||rt.speechId)&&!item.deleted);if(!speech)return;
  rt.shareSpeechId=speech.id;rt.shareVersions=false;const version=ensureVersions(speech);
  openModal(translateUI('Compartilhar ')+typeLabel(speech).toLowerCase(),markupUI`<p class="help">${esc(speech.title)}</p><p class="notice" style="margin-bottom:15px">Somente a versão <strong>${esc(version.name)}</strong>.</p><div class="sheet-options">${option('share-text','FileText',translateUI('Como texto'),isPart(speech)?translateUI('Envia as falas desta versão, com o nome de cada participante.'):translateUI('Envia esta versão como mensagem no WhatsApp ou em outro aplicativo.'))}${option('share-file','BookOpen',translateUI('Como arquivo do SePrepare'),translateUI('Preserva o nome da versão, o texto e a formatação. Quem receber pode conferir antes de salvar.'))}${speech.versions.length>1?option('share-versions','Copy',translateUI('Escolher versões'),translateUI('Marque só as versões que deseja enviar.')):''}</div><p class="notice" style="margin-top:15px">Escolha o WhatsApp na lista de aplicativos do Android.</p>`);rt.modal='share';rt.q?.blur();shareCodes.addShareOption();
}
function shareVersions(){
  syncCurrent();const speech=state.speeches.find(item=>item.id===rt.shareSpeechId&&!item.deleted);if(!speech)return;
  rt.shareVersions=true;
  openModal(translateUI('Compartilhar versões'),markupUI`<p class="help">Marque só as versões de <strong>${esc(speech.title)}</strong> que deseja enviar.</p><div class="sheet-options">${speech.versions.map(version=>markupUI`<label class="sheet-option version-choice share-version-choice ${version.id===speech.activeVersionId?'selected':''}"><input type="checkbox" name="shareVersion" value="${esc(version.id)}" ${version.id===speech.activeVersionId?'checked':''}><span><strong>${esc(version.name)}</strong><small>${version.id===speech.activeVersionId?translateUI('Versão ativa · '):''}${words(plain(version.delta))} palavras</small></span></label>`).join('')}</div><p class="notice" id="shareVersionCount" style="margin-top:15px"></p>`,btn('share-text',translateUI('Como texto'),'FileText','secondary share-format-action')+btn('share-file',translateUI('Como arquivo'),'BookOpen','share-format-action'));rt.modal='share';
  const update=()=>{const count=$$('input[name="shareVersion"]:checked').length;$('#shareVersionCount').textContent=count===1?translateUI('1 versão selecionada'):formatUI`${count} versões selecionadas`;$$('.modal-footer button').forEach(button=>button.disabled=!count);$$('input[name="shareVersion"]').forEach(input=>input.closest('label').classList.toggle('selected',input.checked));};
  $$('input[name="shareVersion"]').forEach(input=>input.addEventListener('change',update));update();
}
async function sendSpeechShare(asFile){
  syncCurrent();const speech=state.speeches.find(item=>item.id===rt.shareSpeechId&&!item.deleted);if(!speech)return;
  const title=speech.title,ids=rt.shareVersions?$$('input[name="shareVersion"]:checked').map(input=>input.value):[speech.activeVersionId];
  try{
    if(asFile){
      const name=shareFilename(title),json=encodeSpeechVersions(speech,ids);
      if(native?.shareSpeechFile){native.shareSpeechFile(name,json);closeModal();return;}
      const file=new File([json],name,{type:SPEECH_MIME});
      if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title,files:[file]});closeModal();}
      else{exportFile(name,SPEECH_MIME,json);closeModal();}
    }else{
      const text=messageTextVersions(speech,ids);
      if(text.length>100000)throw Error(translateUI('O texto selecionado é muito longo para mensagem. Compartilhe como arquivo.'));
      if(native?.shareText){native.shareText(title,text);closeModal();return;}
      if(navigator.share){await navigator.share({title,text});closeModal();}
      else if(navigator.clipboard){await navigator.clipboard.writeText(text);closeModal();toast(translateUI('Texto copiado. Cole na conversa do WhatsApp.'));}
      else toast(translateUI('Abra esta preparação no aplicativo SePrepare para compartilhar.'));
    }
  }catch(error){if(error.name!=='AbortError')toast(translateUI('Não foi possível compartilhar: ')+systemMessage(error.message));}
}
function incomingPreviewContent(){
  const incoming=rt.incomingSpeech,content=incoming.content,version=content.versions?.find(item=>item.id===incoming.previewVersionId);
  return version?{...content,...version}:content;
}
function renderIncomingPreview(){
  const incoming=rt.incomingSpeech,speech=incomingPreviewContent(),key=incoming.previewVersionId||'single';
  $('#incomingDetails').innerHTML=markupUI`<span class="badge">${words(plain(speech.delta))} palavras</span><span class="badge">${speech.targetMinutes} minutos</span>${isPart(speech)?markupUI`<span class="badge">${speech.participants.length} participantes · ${partSegments(speech).filter(turn=>turn.participantId&&turn.text.trim()).length} trechos identificados</span>`:''}`;
  const identity=$('.incoming-identity');identity.hidden=!isPart(speech);identity.innerHTML=isPart(speech)?markupUI`<label for="incomingParticipant">Qual participante é você?</label><select id="incomingParticipant">${speech.participants.length?htmlUI('<option value="">Escolha seu participante…</option>'):''}<option value="__observer__">Só acompanhar</option>${speech.participants.map(person=>markupUI`<option value="${esc(person.id)}">${esc(person.name)}</option>`).join('')}</select><small>As suas falas serão destacadas somente neste aparelho.</small>`:'';
  const select=$('#incomingParticipant'),me=incoming.identities[key]??incoming.defaultIdentity??'';
  if(select&&(me==='__observer__'||speech.participants.some(person=>person.id===me)))select.value=me;
  const render=()=>{$('.incoming-document').innerHTML=documentHTML(speech,select?.value||'');refreshHighlightContrast();};
  if(select)select.addEventListener('change',()=>{incoming.identities[key]=select.value;incoming.defaultIdentity=select.value;render();});render();
}
function previewIncoming(content,name){
  content=portableSharedContent(content);rt.incomingSpeech={content,name,previewVersionId:content.activeVersionId||'',identities:{}};
  openModal(isPart(content)?translateUI('Parte recebida'):translateUI('Discurso recebido'),markupUI`<p class="help">Confira ${isPart(content)?translateUI('a parte'):translateUI('o discurso')}. Só entra no seu caderno se você escolher salvar.${content.versions?.length>1?translateUI(' As ')+content.versions.length+translateUI(' versões ficam juntas na mesma preparação.'):''}</p><div class="incoming-heading">${typeBadge(content)}<h3>${esc(content.title)}</h3>${content.subtitle?markupUI`<p>${esc(content.subtitle)}</p>`:''}<div class="row wrap" id="incomingDetails"></div></div>${content.versions?markupUI`<div class="field incoming-version"><label for="incomingVersion">Versão para conferir</label><select id="incomingVersion">${content.versions.map(version=>markupUI`<option value="${esc(version.id)}" ${version.id===content.activeVersionId?'selected':''}>${esc(version.name)}</option>`).join('')}</select></div>`:''}<section class="incoming-options"><div class="field"><label for="incomingCategory">Salvar na categoria</label><select id="incomingCategory"><option value="">Sem categoria</option>${state.categories.map(category=>markupUI`<option value="${esc(category.id)}">${esc(category.name)}</option>`).join('')}</select></div><div class="incoming-checks">${rhythmUI.incomingOption(content)}</div></section><div class="field incoming-identity"></div><div class="incoming-paper"><article class="reader-text incoming-document"></article></div>`,btn('discard-incoming',translateUI('Não salvar'),'','secondary')+btn('save-incoming',translateUI('Salvar no aparelho'),'Download'),true);rt.modal='incoming';rt.q?.blur();renderIncomingPreview();$('#incomingVersion')?.addEventListener('change',event=>{rt.incomingSpeech.previewVersionId=event.target.value;renderIncomingPreview();});
}
function saveIncoming(){
  const incoming=rt.incomingSpeech;if(!incoming)return;const me=$('#incomingParticipant')?.value||'';
  if(isPart(incoming.content)&&!me){toast(translateUI('Escolha seu participante ou a opção Só acompanhar.'));$('#incomingParticipant').focus();return;}
  const adoption=rhythmUI.receive(incoming.content);
  const chosen=$('#incomingCategory')?.value||'',categoryId=state.categories.some(category=>category.id===chosen)?chosen:'',speech=Object.assign(newSpeech(categoryId),adoption.content);
  if(speech.versions){speech.activeVersionId=incoming.previewVersionId;const version=speech.versions.find(item=>item.id===speech.activeVersionId);speech.delta=version.delta;if(isPart(speech))speech.participants=version.participants;}
  validState({schema:1,speeches:[speech],categories:[]});
  for(const version of speech.versions){version.createdAt=speech.createdAt;version.updatedAt=speech.updatedAt;}
  if(isPart(speech))for(const version of speech.versions){const identity=incoming.identities[version.id]??me;version.myParticipantId=version.participants.some(person=>person.id===identity)?identity:'';}
  copyDocumentVersions(speech);state.speeches.unshift(speech);if(persist(true)===false){state.speeches=state.speeches.filter(item=>item.id!==speech.id);adoption.rollback();return;}
  closeModal();rt.returnTo='home';go('reader',speech.id);toast(isPart(speech)?translateUI('Parte salva no aparelho.'):translateUI('Discurso salvo no aparelho.'));
}
function handleImport(name,text,speechOnly=false){
  if(rt.incomingSpeech){rt.importQueue.push({name,text,speechOnly});return;}
  try{
    if(typeof text!=='string'||text.length>12000000)throw Error(translateUI('Arquivo muito grande ou inválido.'));
    if(speechOnly){previewIncoming(decodeSpeech(text),name);return;}
    const portableFile=/\.(?:seprepare|orador)(?:\.json)?$/i.test(name);
    if(text.trim().startsWith('{')){
      const data=JSON.parse(text.trim());
      if(data.schema===1&&Array.isArray(data.speeches)&&!portableFile){validState(data);rt.importBackup=data;openModal(translateUI('Importar seu caderno'),markupUI`<p class="help">Encontramos ${data.speeches.filter(s=>!s.deleted).length} discursos e ${data.categories.length} categorias. Eles serão mesclados com seu caderno. Os discursos atuais serão preservados.</p>`,btn('merge-backup',translateUI('Importar discursos'),'FileUp'));return;}
      previewIncoming(decodeSpeech(text),name);return;
    }
    if(portableFile)throw Error(translateUI('Esse arquivo não é um discurso válido do SePrepare.'));
    const speech=newSpeech();speech.title=name.replace(/\.(html?|txt|md)$/i,'')||translateUI('Discurso recebido');
    if(/<\s*(?:!doctype|html|body|p|div|h[1-6]|article|span|blockquote)\b/i.test(text)){
      const doc=new DOMParser().parseFromString(text,'text/html'),content=doc.querySelector('#speech,.speech,.reader-text,article,main')||doc.body;speech.title=doc.querySelector('h1')?.textContent||speech.title;speech.subtitle=doc.querySelector('.subtitle')?.textContent||'';speech.delta=deltaFromHTML(content.innerHTML);
    }else if(/\.md$/i.test(name))speech.delta=deltaFromHTML(marked.parse(text,{async:false}));
    else speech.delta={ops:[{insert:text.endsWith('\n')?text:text+'\n'}]};
    previewIncoming(speech,name);
  }catch(error){toast(error.message||translateUI('Não foi possível abrir esse arquivo.'));}
}
function mergeBackup(){const data=rt.importBackup;if(!data)return;const ids=new Map(),map=new Map();for(const c of data.categories){const same=state.categories.find(x=>x.id===c.id);if(!same){state.categories.push(clone(c));map.set(c.id,c.id);}else if(same.name===c.name)map.set(c.id,c.id);else{const copy={...clone(c),id:uid()};state.categories.push(copy);map.set(c.id,copy.id);}}
  let n=0;for(const original of data.speeches){ids.set(original.id,original.id);const same=state.speeches.find(s=>s.id===original.id);if(same&&JSON.stringify(contentSnapshot(same))===JSON.stringify(contentSnapshot(original))&&documentVersionsKey(same)===documentVersionsKey(original))continue;const adopted=receiveRhythms(original,state.settings.rhythms||[],true);state.settings.rhythms=adopted.catalog;const s=adopted.content;if(same)s.id=uid();ids.set(original.id,s.id);s.categoryId=map.get(s.categoryId)||'';pauseAllVersionTimers(s);state.speeches.push(s);n++;}
  mergeImportedMetadata(state,data,ids,map,uid);state.vocabulary=[...new Set([...state.vocabulary,...(data.vocabulary||[])])];withChangeOrigin('manual-restore',()=>persist(true));closeModal();rt.view='home';rt.speechId=null;rt.q=null;editorDocument=null;render();toast(formatUI`${n} discursos importados.`);
}
// A document stays in the trash for 30 full days after it was moved there.
// Legacy trash entries with no deletion date receive a new 30-day window.
const TRASH_RETENTION_MS=30*24*60*60*1000;
function expireTrash(){
  if(stateReadFailed)return 0;
  const now=Date.now(),old=state.speeches,kept=[];
  let removed=0,changed=false;
  for(const s of old){
    if(!s.deleted){kept.push(s);continue;}
    const date=Number(s.deletedAt);
    if(Number.isFinite(date)&&date>0&&date<=now-TRASH_RETENTION_MS){removed++;changed=true;continue;}
    if(!Number.isFinite(date)||date<=0){kept.push({...s,deletedAt:now});changed=true;}
    else kept.push(s);
  }
  if(changed){state.speeches=kept;if(!persist(true)){state.speeches=old;return -1;}}
  return removed;
}
function permanentlyDeleteFromTrash(id=null){
  if(stateReadFailed)return false;
  const before=state.speeches;
  const after=before.filter(s=>!s.deleted||(id!==null&&s.id!==id));
  if(after.length===before.length)return false;
  state.speeches=after;
  if(!persist(true)){state.speeches=before;return false;}
  return before.length-after.length;
}
function trash(){
  expireTrash();
  const discarded=state.speeches.filter(s=>s.deleted);
  const rows=discarded.length?markupUI`<div class="trash-list">${discarded.map(s=>markupUI`<article class="trash-item"><span class="trash-item-icon" aria-hidden="true">${icon('Archive')}</span><div class="trash-item-content"><strong>${esc(s.title)}</strong><small>${esc(category(s.categoryId).name)} · Excluído em ${dateLabel(s.deletedAt)}</small><button type="button" class="trash-restore" data-action="restore-speech" data-id="${esc(s.id)}" aria-label="Restaurar ${esc(s.title)}">${icon('RotateCcw')}<span>Restaurar</span></button></div></article>`).join('')}</div>`:'';
  openModal(translateUI('Lixeira'),markupUI`<p class="help">Itens na lixeira são excluídos automaticamente após 30 dias. Até lá, você pode restaurá-los. Use o botão abaixo para esvaziar toda a lixeira.</p>${rows||htmlUI('<div class="empty"><h3>Sua lixeira está vazia</h3></div>')}`,discarded.length?btn('trash-empty',translateUI('Esvaziar lixeira'),'Trash2','danger'):'' );
}
function dictionary(){openModal(translateUI('Seu dicionário pessoal'),markupUI`<p class="help">Nomes, termos e palavras que você usa nos discursos. Uma palavra por linha.</p><div class="field"><label for="personalDictionary">Palavras reconhecidas na revisão local</label><textarea id="personalDictionary" rows="8" placeholder="Jeová\nCoríntios\nNomes próprios…">${esc(dictionaryWords(state.vocabulary).join('\n'))}</textarea></div><section class="personal-corrections"><h3>Correções lembradas</h3><p class="notice">São sugestões para futuras revisões. Nenhum texto é substituído automaticamente.</p>${rememberedCorrections(state.vocabulary).map((row,i)=>markupUI`<div class="personal-correction-row"><span>${esc(row.word)} → ${esc(row.replacement)}</span><button type="button" class="icon-btn" data-action="forget-correction" data-index="${i}" aria-label="Esquecer correção">${icon('X')}</button></div>`).join('')||htmlUI('<p class="notice">Nenhuma correção lembrada.</p>')}</section>`,btn('save-dictionary',translateUI('Salvar dicionário'),'Check'));}

document.addEventListener('pointerdown',event=>{if(rt.q&&event.target.closest('.toolbar button,.part-assignment-bar button,.note-action,.rhythm-action,#editorTimeAction,#editorFormatAction,#estimatedTime,.editor-footer-close,.presenter-note-marker'))event.preventDefault();});
document.addEventListener('click',event=>{
  const el=event.target.closest('[data-action]');if(!el||el.disabled)return;
  const action=el.dataset.action,id=el.dataset.id;
  try{if(timeMarkUI.handle(action)||rhythmUI.handle(action,id)||legalUI.handle(action)||updatesUI.handle(action,id)||shareCodes.handle(action)||driveUI.handle(action,id)||notesUI.handle(action,id)||supportUI.handle(action,id)||versionsUI.handle(action,id))return;switch(action){
    case 'nav':go(el.dataset.view);break;
    case 'back':back();break;
    case 'close-modal':closeModal();break;
    case 'theme':state.settings.theme=state.settings.theme==='dark'?'light':'dark';applyTheme();persist();if(rt.view!=='reader'&&!rt.q)render();break;
    case 'new-item':openModal(translateUI('O que vamos preparar?'),markupUI`<p class="help">Escolha o formato da sua preparação.</p><div class="sheet-options">${[['speech','Mic',translateUI('Discurso')],['part','Users',translateUI('Demonstração')]].map(([kind,image,label])=>markupUI`<div class="creation-option"><button type="button" class="sheet-option" data-action="${kind==='part'?'new-part':'new-speech'}" data-creation-kind="${kind}">${icon(image)}<span><strong>${label}</strong></span>${icon('ChevronRight')}</button><button type="button" class="creation-info" data-creation-help="${kind}" aria-label="${esc(translateUI('Sobre ')+label)}">${icon('Info')}</button></div>`).join('')}</div>`);break;
    case 'new-part':{const s=newPart(state.categories.some(c=>c.id===rt.filter)?rt.filter:'');s.editorUnpublished=true;state.speeches.unshift(s);rt.editorFrom=rt.view;go('editor',s.id);break;}
    case 'type-filter':rt.typeFilter=el.dataset.value;renderHome();break;
    case 'add-participant':partsUI.editParticipant();break;
    case 'edit-participant':partsUI.editParticipant(id);break;
    case 'save-participant':partsUI.saveParticipant();break;
    case 'remove-participant':partsUI.removeParticipant();break;
    case 'manage-participants':partsUI.showParticipants();break;
    case 'assign-speaker':partsUI.assignSpeaker(id);break;
    case 'clear-speaker':partsUI.assignSpeaker('');break;
    case 'save-editor':saveEditorChanges();break;
    case 'toggle-my-lines':toggleMyLines();break;
    case 'choose-my-participant':partsUI.chooseMe();break;
    case 'save-my-participant':partsUI.saveMe();break;
    case 'new-speech':{const s=newSpeech(state.categories.some(c=>c.id===rt.filter)?rt.filter:state.categories[0]?.id||'');s.editorUnpublished=true;state.speeches.unshift(s);rt.editorFrom=rt.view;go('editor',s.id);break;}
    case 'edit':rt.editorFrom=['editor','part'].includes(rt.view)?rt.editorFrom:rt.view==='reader'?rt.returnTo:rt.view;{const target=state.speeches.find(s=>s.id===(id||rt.speechId));go('editor',target?.id);}break;
    case 'open':case 'present':rt.returnTo=rt.view==='reader'?rt.returnTo:rt.view;go('reader',id||rt.speechId);break;
    case 'filter':rt.filter=id;renderHome();break;
    case 'sort':openModal(translateUI('Ordenar seu caderno'),markupUI`<div class="sheet-options">${[['updated','Clock',translateUI('Últimas alterações')],['title','Type',translateUI('Título, de A a Z')],['date','CalendarDays',translateUI('Data agendada')]].map(([v,i,l])=>option('set-sort',i,l,rt.sort===v?translateUI('Ordenação atual'):'',`data-value="${v}"`)).join('')}</div>`);break;
    case 'set-sort':rt.sort=el.dataset.value;closeModal();renderSpeechResults();break;
    case 'speech-menu':speechMenu(id);break;
    case 'share':shareSpeech(id);break;
    case 'share-text':void sendSpeechShare(false);break;
    case 'share-file':void sendSpeechShare(true);break;
    case 'share-versions':shareVersions();break;
    case 'save-incoming':saveIncoming();break;
    case 'discard-incoming':closeModal();break;
    case 'pin':active().pinned=!active().pinned;persist(true);closeModal();if(!['editor','part'].includes(rt.view))render();toast(active()?.pinned?translateUI('Fixado no topo.'):translateUI('Removido dos fixados.'));break;
    case 'duplicate':{syncCurrent();const s=clone(active());s.id=uid();s.title+=translateUI(' (cópia)');s.pinned=false;s.createdAt=s.updatedAt=Date.now();s.scheduledAt=0;s.timer={running:false,elapsedMs:0,startedAt:0};s.history=[];s.rehearsals=[];copyDocumentVersions(s);state.speeches.unshift(s);go('editor',s.id);toast(translateUI('Cópia criada.'));break;}
    case 'delete-speech':{const s=active();if(rt.audio.speechId===s.id)pauseAudio();s.deleted=true;s.deletedAt=Date.now();Object.assign(confirmedDocument(),{deleted:true,deletedAt:s.deletedAt});go('home');toast(translateUI('Movido para a lixeira.'));break;}
    case 'new-category':editCategory();break;
    case 'edit-category':editCategory(id);break;
    case 'category-icon':$('#categoryIconGrid').dataset.chosen=el.dataset.icon;$('#categoryEmoji').value='';updateCategoryAppearance();break;
    case 'category-color':$('#categoryColor').value=el.dataset.color;$('#categoryColorPicker').colorPicker.setColor(el.dataset.color,{resetInputs:true});updateCategoryAppearance();break;
    case 'category-custom-color':{const picker=$('#categoryColorPicker'),opening=picker.hidden;if(!opening&&!picker.colorPicker.validate())break;picker.hidden=!opening;el.setAttribute('aria-expanded',String(opening));if(opening)picker.scrollIntoView({block:'nearest',behavior:'auto'});break;}
    case 'save-category':saveCategory();break;
    case 'delete-category':state.categories=state.categories.filter(c=>c.id!==rt.editCategoryId);for(const s of state.speeches)if(s.categoryId===rt.editCategoryId)s.categoryId='';persist(true);closeModal();rt.filter='all';render();toast(translateUI('Categoria removida. Seus discursos foram preservados.'));break;
    case 'open-category':rt.filter=id;go('home');break;
    case 'assign-category':assignCategory();break;
    case 'set-category':active().categoryId=id;persist(true);closeModal();refreshEditorMeta();break;
    case 'schedule':schedule(id);break;
    case 'save-schedule':saveSchedule();break;
    case 'clear-schedule':active().scheduledAt=0;persist(true);closeModal();if(['editor','part'].includes(rt.view))refreshEditorMeta();else render();toast(translateUI('Agendamento removido.'));break;
    case 'choose-schedule':openModal(translateUI('Escolha a preparação'),markupUI`<div class="sheet-options">${visibleSpeeches().map(s=>option('schedule','BookOpen',s.title,category(s.categoryId).name,`data-id="${esc(s.id)}"`)).join('')||option('new-item','Plus',translateUI('Criar discurso ou parte'))}</div>`);break;
    case 'duration':duration();break;
    case 'save-duration':{const n=Number($('#durationMinutes').value);if(!Number.isFinite(n)||n<1||n>240){toast(translateUI('Escolha um tempo entre 1 e 240 minutos.'));break;}active().targetMinutes=n;persist(true);closeModal();refreshEditorMeta();break;}
    case 'undo':rt.q?.history.undo();updateScope();break;
    case 'redo':rt.q?.history.redo();updateScope();break;
    case 'format':format(el.dataset.format);break;
    case 'select-all':if(rt.q){rt.q.setSelection(0,rt.q.getLength()-1,'silent');rt.selection={index:0,length:rt.q.getLength()-1};updateScope();}break;
    case 'font':showFonts();break;
    case 'apply-font':{const font=$('#fontFamily').value,size=$('#fontSize').value,heading=Number($('#headingStyle').value);format('font',font);format('size',size||false);format('header',heading||false);closeModal();toast(translateUI('Estilo aplicado.'));break;}
    case 'colors':showColors();break;
    case 'swatch':$('#textColor').value=el.dataset.color;break;
    case 'apply-color':format('color',$('#textColor').value);closeModal();break;
    case 'apply-highlight':format('background',$('#highlightColor').value);closeModal();break;
    case 'clear-highlight':format('background',false);closeModal();break;
    case 'more-format':moreFormat();break;
    case 'list':{const r=scope(),value=el.dataset.value,current=rt.q.getFormat(r.index,r.length).list;format('list',current===value?false:value);format('ordinal',false);closeModal();break;}
    case 'ordinal-list':format('list','ordered');format('ordinal','true');closeModal();break;
    case 'block-quote':format('blockquote');closeModal();break;
    case 'align':format('align',el.dataset.value||false);closeModal();break;
    case 'upper':changeCase('upper');break;
    case 'lower':changeCase('lower');break;
    case 'clear-format':clearFormatting();break;
    case 'link':openModal(translateUI('Uma referência para suas palavras'),markupUI`<div class="field"><label for="linkAddress">Endereço do link</label><input id="linkAddress" type="url" placeholder="https://…"></div>`,btn('apply-link',translateUI('Inserir link'),'Link2'));break;
    case 'apply-link':{const url=$('#linkAddress').value.trim();if(!/^https?:\/\//i.test(url)){toast(translateUI('Use um endereço começando por https://.'));break;}format('link',url);closeModal();break;}
    case 'remove-link':format('link',false);closeModal();break;
    case 'paste':openPaste();break;
    case 'do-paste':pasteContent(el.dataset.mode);break;
    case 'pages':pagesMenu();break;
    case 'set-layout':active().layout=el.dataset.layout;persist(true);closeModal();if(rt.q){const p=$('.editor-status [data-action="pages"]');if(p)p.innerHTML=icon('FileText')+(active().layout==='pages'?translateUI('Páginas'):translateUI('Página contínua'));}else renderReaderContent();break;
    case 'page-break':insertPageBreak();break;
    case 'editor-find':editorFind?.open();break;
    case 'review':beginReview();break;
    case 'review-custom':{const m=rt.review?.matches[Number(el.dataset.index)];if(m){m.customOpen=true;renderReview();$('#customCorrection'+el.dataset.index)?.focus();}break;}
    case 'apply-custom-review':{const r=rt.review,m=r?.matches[Number(el.dataset.index)];if(!m)break;const value=m.customValue.trim();if(!value){toast(translateUI('Digite uma correção válida.'));break;}if(r.protect&&m.protected)break;m.customValue=value;m.chosen=value;for(const other of r.matches)other.selected=other===m;r.highlight=false;applyReview();break;}
    case 'review-choice':{const m=rt.review.matches[Number(el.dataset.index)];m.chosen=m.replacements[Number(el.dataset.choice)];m.selected=!(rt.review.protect&&m.protected);renderReview();break;}
    case 'review-select-safe':for(const m of rt.review.matches)m.selected=!!m.safe&&!(rt.review.protect&&m.protected);renderReview();break;
    case 'learn-word':{const m=rt.review.matches[Number(el.dataset.index)];state.vocabulary=[...new Set([...state.vocabulary,m.word.toLocaleLowerCase('pt-BR')])];rt.review.matches=rt.review.matches.filter(x=>x.word!==m.word);persist();renderReview();toast(translateUI('Palavra adicionada ao seu dicionário.'));break;}
    case 'apply-review':applyReview();break;
    case 'auto-format':showAutoHighlights();break;
    case 'apply-auto-highlights':applySemanticFormatting();break;
    case 'history':history();break;
    case 'restore-version':restoreContentHistory(id);break;
    case 'reader-settings':readingSettings();break;
    case 'toggle-time-marks':toggleReaderTimeMarks();break;
    case 'toggle-reader-rhythms':rhythmUI.setReaderVisibility(active()?.read.showRhythms!==true);updateReaderVisibilityButtons();break;
    case 'reader-pages':active().layout=active().layout==='pages'?'flow':'pages';rt.page=0;persist(true);renderReaderContent();closeModal();break;
    case 'prev-page':rt.page--;renderReaderContent();window.scrollTo(0,$('.reader-paper').offsetTop-12);break;
    case 'next-page':rt.page++;renderReaderContent();window.scrollTo(0,$('.reader-paper').offsetTop-12);break;
    case 'focus':toggleFocus();break;
    case 'timer-start':toggleTimer();break;
    case 'timer-toggle':toggleTimer();break;
    case 'timer-restart':restartTimer();break;
    case 'timer-stop':case 'finish-rehearsal':finishRehearsal();break;
    case 'speak':speak();break;
    case 'audio-settings':audioSettings();break;
    case 'refresh-voices':voicePicker.refresh();break;
    case 'save-audio':saveAudio();break;
    case 'test-voice':testVoice();break;
    case 'install-voices':if(native)native.installVoices();else toast(translateUI('Gerencie as vozes de texto em voz nas configurações do Android.'));break;
    case 'save-review-settings':{const endpoint=$('#reviewEndpoint').value.trim();if(!/^https:\/\//.test(endpoint)){toast(translateUI('Use um endereço HTTPS válido.'));break;}state.settings.reviewEndpoint=endpoint;state.settings.onlineReview=$('#onlineReview').checked;persist(true);toast(translateUI('Ajustes de revisão salvos.'));break;}
    case 'save-pace':{const pace=Number($('#readingPace').value);if(pace<70||pace>250){toast(translateUI('Use um ritmo entre 70 e 250 palavras por minuto.'));break;}state.settings.pace=pace;persist(true);toast(translateUI('Ritmo de leitura salvo.'));break;}
    case 'dictionary':dictionary();break;
    case 'forget-correction':{const row=rememberedCorrections(state.vocabulary)[Number(el.dataset.index)];if(row){state.vocabulary=forgetCorrection(state.vocabulary,row.word);persist(true);dictionary();}break;}
    case 'save-dictionary':state.vocabulary=[...new Set([...correctionRecords(state.vocabulary),...$('#personalDictionary').value.split('\n').map(w=>w.trim()).filter(Boolean)])].slice(0,5000);if(worker){worker.terminate();worker=null;}persist(true);closeModal();toast(translateUI('Dicionário pessoal salvo.'));break;
    case 'backup':{if(stateReadFailed){exportFile('seprepare-recuperacao.json','application/json',storedRaw);break;}persist(true);const backup=clone(state);for(const doc of backup.speeches)pauseAllVersionTimers(doc);exportFile('seprepare-backup-'+new Date().toISOString().slice(0,10)+'.json','application/json',JSON.stringify(backup,null,2));break;}
    case 'export-speech':exportSpeech();break;
    case 'export-format':doExportSpeech(el.dataset.format);break;
    case 'import':shareCodes.openImport();break;
    case 'merge-backup':mergeBackup();break;
    case 'trash':trash();break;
    case 'trash-empty':{const count=state.speeches.filter(s=>s.deleted).length;if(!count){trash();break;}openModal(translateUI('Esvaziar lixeira?'),markupUI`<p class="help">${count} ${count===1?translateUI('item será apagado'):translateUI('itens serão apagados')} definitivamente. Não será possível restaurar depois.</p>`,btn('close-modal',translateUI('Cancelar'),'','secondary')+btn('trash-empty-confirm',translateUI('Esvaziar definitivamente'),'Trash2','danger'));break;}
    case 'trash-empty-confirm':{const deleted=permanentlyDeleteFromTrash();trash();toast(deleted?formatUI`${deleted} ${deleted===1?translateUI('item excluído'):translateUI('itens excluídos')} definitivamente.`:translateUI('Não foi possível esvaziar. Nada foi removido.'));break;}
    case 'restore-speech':{const s=state.speeches.find(s=>s.id===id&&s.deleted);if(!s)break;const before={deleted:s.deleted,deletedAt:s.deletedAt,updatedAt:s.updatedAt};s.deleted=false;delete s.deletedAt;s.updatedAt=Date.now();if(!persist(true)){Object.assign(s,before);toast(translateUI('Não foi possível restaurar.'));}else toast(translateUI('Restaurado no caderno.'));trash();break;}
    case 'notifications':if(native)native.requestNotifications();else toast(translateUI('Os lembretes são configurados no APK Android.'));break;
    case 'exact-alarms':if(native)native.requestExactAlarms();else toast(translateUI('O APK permite solicitar horários precisos no Android.'));break;
  }}catch(error){console.error('SePrepare:',action,error);toast(translateUI('Não foi possível concluir essa ação: ')+systemMessage(error.message));}
});
function back(){if(editorFind?.isOpen()){editorFind.close();return true;}if($('.modal-backdrop')){closeModal();return true;}if(rt.focus){toggleFocus();return true;}if(rt.view==='reader'){go(['editor','home','agenda','categories','settings'].includes(rt.returnTo)?rt.returnTo:'home');return true;}if(rt.view==='editor'){go(['home','agenda','categories','settings'].includes(rt.editorFrom)?rt.editorFrom:'home');return true;}if(rt.view!=='home'){go('home');return true;}return false;}
window.oradorBack=back;
document.addEventListener('keydown',e=>{if(e.key==='Escape')back();});
window.addEventListener('nativeProofread',e=>{const r=rt.review,data=e.detail;if(!r||data.token!==r.token)return;r.remoteDone=true;if(data.error)r.remoteError=data.error;else r.remoteMatches=(data.result?.matches||[]).filter(m=>m.replacements?.length).map(m=>({offset:m.offset,length:m.length,word:r.text.slice(m.offset,m.offset+m.length),message:m.message,replacements:m.replacements.map(x=>x.value).slice(0,4),safe:false,kind:'grammar'}));mergeReviewMatches();if(rt.modal==='review')renderReview();});
window.addEventListener('nativeVoicesReady',()=>loadVoices());
window.addEventListener('nativeForeground',()=>{if(rt.modal==='audio-settings')loadVoices();});
window.addEventListener('focus',()=>{if(rt.modal==='audio-settings')loadVoices();});
window.addEventListener('nativeSpeech',e=>audioPlayer.receive(e.detail));
window.addEventListener('nativeImport',e=>handleImport(e.detail.name,e.detail.text,e.detail.speechOnly));
window.addEventListener('nativeSaved',()=>toast(translateUI('Arquivo salvo no local escolhido.')));
window.addEventListener('nativeError',e=>toast(e.detail.message));
window.addEventListener('nativeOpenSpeech',e=>{if(state.speeches.some(s=>s.id===e.detail.id&&!s.deleted)){rt.returnTo='home';go('reader',e.detail.id);}});
window.addEventListener('nativePermissions',e=>{rt.permissions=e.detail.status;const summary=$('#permissionsSummary');if(summary)summary.textContent=permissionSummary();});
if('speechSynthesis'in window)speechSynthesis.addEventListener('voiceschanged',loadVoices);
async function start(){
  try{await removeLegacyDefaults(state);}catch(error){console.error(translateUI('SePrepare: limpeza dos exemplos não concluída; dados preservados.'),error);}
  for(const s of state.speeches)ensureVersions(s);
  expireTrash();
  render();withChangeOrigin('migration',()=>persist(true));
  window.orador={getState:()=>clone(state),getEditor:()=>rt.q,getRuntime:()=>rt,flush:()=>persist(true)};
  await legalUI.start();
  if(native){try{const initial=JSON.parse(native.ready());rt.permissions=initial.permissions;if(initial.id&&state.speeches.some(s=>s.id===initial.id&&!s.deleted)){rt.returnTo='home';go('reader',initial.id);}if(initial.shared)handleImport(translateUI('Texto compartilhado.txt'),initial.shared);for(const file of initial.imports||[])handleImport(file.name,file.text,file.speechOnly);for(const message of initial.errors||[])toast(message);}catch(e){toast(translateUI('Não foi possível restaurar a navegação. Seus discursos continuam no caderno.'));}}
  // Introspection is limited to document actions, and is also used by the automated editor checks.
  driveUI.start();updatesUI.start();

}
audioPlayer=createAudioPlayer({native,rt,$,$$,icon,getSettings:()=>state.settings,getActive:active,toast,onProgress:markAudioParagraph});
voicePicker=createVoicePicker({native,rt,$,esc,getSettings:()=>state.settings,audioPlayer});
const partsUI=createPartsUI({getState:()=>state,getActive:active,rt,$,icon,btn,ib,esc,openModal,closeModal,persist,checkpoint,go,toast,category,refreshReader:()=>{const focus=rt.focus,page=rt.page;renderReader();rt.page=page;renderReaderContent();applyReadSettings();if(focus){rt.focus=false;toggleFocus();}}});
const versionsUI=createVersionsUI({getState:()=>state,getActive:active,rt,$,icon,btn,ib,esc,option,openModal,closeModal,persist,toast,history,documentHTML,refreshContrast:refreshHighlightContrast,commit:commitVersionChange});
const timeMarkUI=createTimeMarkUI({$,rt,btn,icon,esc,t:translateUI,openModal,closeModal,getActive:active,getState:()=>state,persist,toast,elapsed:timerElapsed});
const rhythmUI=createRhythmUI({getState:()=>state,getActive:active,rt,$,btn,icon,esc,openModal,closeModal,persist,toast,Delta,refreshReader:renderReaderContent});
const notesUI=createNotesUI({getState:()=>state,getActive:active,rt,$,icon,btn,esc,openModal,closeModal,toast,Delta,commit:commitNoteChange,persist,refreshReaderContent:()=>{renderReaderContent();markAudioParagraph();}});
const shareCodes=createShareCodeUI({rhythms:rhythmUI,getState:()=>state,rt,$,icon,btn,option,esc,native,openModal,closeModal,toast,syncCurrent,persist,importFile,exportFile,documentHTML,refreshContrast:refreshHighlightContrast,go});
let supportUI=createSupportUI({icon,btn,openModal,version:APP_VERSION});
const legalUI=createLegalNoticeUI({native,rt,$,icon,btn,esc,openModal,closeModal,toast});
const updatesUI=createAppUpdatesUI({native,rt,$,icon,btn,esc,openModal,closeModal,getState:()=>state,installedCode:APP_VERSION_CODE});
const driveUI=createDriveUI({native,rt,$,icon,btn,esc,openModal,closeModal,toast,getState:()=>state,readable:()=>!stateReadFailed,persist,
 commitRestore(next){
  const previous=state;next.settings.language=normalizeLanguage(previous.settings.language);state=next;
  if(!persist(true)){state=previous;try{native?.saveState(JSON.stringify(previous));}catch{}return false;}
  for(const s of state.speeches)ensureVersions(s);
  applyTheme();render();return true;
 },showHome(){rt.q=null;editorDocument=null;rt.view='home';rt.speechId=null;render();window.scrollTo(0,0);}
});
start();
