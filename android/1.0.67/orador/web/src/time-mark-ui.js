import {TIME_MARK_ATTRIBUTE,parseTimeMark,timeMarkValue,formatTimeMark,compareTimeMark,timeMarks,timeMarkColors} from './time-mark-core.js';
export function createTimeMarkUI(c){
 const {$,rt,btn,icon,esc,openModal,closeModal}=c;let context=null,readerNodes=[],current=null,frame=0,selected=null;
 const label=seconds=>formatTimeMark(seconds);
 function editor(){
  const q=rt.q;if(!q)return;const range=q.getSelection()||rt.selection||{index:0,length:0},[line,offset]=q.getLine(range.index);if(!line)return;if(line.domNode?.tagName==='HR'){c.toast('Posicione o cursor em um parágrafo para marcar o tempo.');return;}
  const position=range.index-offset+line.length()-1,value=parseTimeMark(q.getFormat(position,1)[TIME_MARK_ATTRIBUTE]);context={q,position,range};
  openModal(value===null?'Marcar tempo':'Editar marcação de tempo',`<div class="stack"><p class="help">Tempo acumulado desde o início da apresentação para chegar a este parágrafo.</p><div class="time-mark-inputs"><div class="field"><label for="markMinutes">Minutos</label><input id="markMinutes" type="number" min="0" max="16666" step="1" inputmode="numeric" value="${value===null?0:Math.floor(value/60)}"></div><div class="field"><label for="markSeconds">Segundos</label><input id="markSeconds" type="number" min="0" max="59" step="1" inputmode="numeric" value="${value===null?0:value%60}"></div></div><p id="markTimeError" role="alert" class="notice" hidden></p><p class="help">A referência acompanha o parágrafo. Para editá-la ou removê-la, posicione o cursor nele e toque em Marcar tempo.</p></div>`,(value!==null?btn('time-mark-remove','Remover','Trash2','secondary'):'')+btn('time-mark-save','Salvar marcação','Check'));rt.modal='time-mark';
 }
 function apply(remove=false){
  if(!context||context.q!==rt.q)return;let value=false;
  try{if(!remove){const m=$('#markMinutes').value,s=$('#markSeconds').value;if(m.trim()===''||s.trim()==='')throw Error('Preencha os minutos e segundos.');value=timeMarkValue(Number(m),Number(s));}}
  catch(e){const error=$('#markTimeError');error.hidden=false;error.textContent=e.message;return;}
  const {q,position,range}=context;closeModal();q.history.cutoff();q.formatLine(position,1,TIME_MARK_ATTRIBUTE,value,'user');q.history.cutoff();q.setSelection(range.index,range.length,'silent');c.persist(true);refreshEditor();
  const marks=timeMarks(q.getContents());if(!remove&&(marks.some((row,i)=>i&&row.seconds<marks[i-1].seconds)||Number(value)>c.getActive().targetMinutes*60))c.toast('Marcação salva. Confira a sequência e a duração prevista: os tempos definidos foram mantidos.');
 }
 function decorate(node){const seconds=parseTimeMark(node.getAttribute('data-speech-time'));if(seconds===null)return;node.dataset.timeLabel=label(seconds);node.dataset.timeState='neutral';node.dataset.timeSeconds=String(seconds);node.title='Tempo previsto: '+label(seconds);}
 function refreshEditor(){if(!rt.q)return;for(const node of rt.q.root.querySelectorAll('[data-time-label]'))if(!node.hasAttribute('data-speech-time')){delete node.dataset.timeLabel;delete node.dataset.timeState;delete node.dataset.timeSeconds;node.removeAttribute('title');}const nodes=rt.q.root.querySelectorAll('[data-speech-time]');rt.q.root.classList.toggle('has-time-marks',!!nodes.length);for(const node of nodes)decorate(node);}
 function refreshReader(){
  current=null;selected=null;readerNodes=[...document.querySelectorAll('#readerText [data-speech-time]')];for(const node of readerNodes)decorate(node);
  const host=$('#readerText');if(host){host.classList.toggle('time-marks-hidden',c.getActive()?.read?.showTimeMarks===false);host.classList.toggle('has-time-marks',!!readerNodes.length);}locate();tick();
 }
 function tick(){
  if(rt.view!=='reader'||!readerNodes.length)return;
  const doc=c.getActive();if(!doc||doc.read.showTimeMarks===false)return;
  if(current&&current!==selected){decorate(current);current=null;}
  if(!selected)return;current=selected;
  const seconds=Number(selected.dataset.timeSeconds),elapsed=c.elapsed()/1000,session=doc.timer.running||doc.timer.active||doc.timer.elapsedMs>0;
  if(!session){decorate(selected);return;}
  const result=compareTimeMark(seconds,elapsed),difference=Math.round(result.difference),suffix=result.state==='on-time'?' ✓':difference<0?' −'+Math.abs(difference)+'s':' +'+difference+'s';
  selected.dataset.timeLabel=label(seconds)+'\n'+suffix.trim();selected.dataset.timeState=result.state;
  const colors=timeMarkColors(result.state,result.intensity);selected.style.setProperty('--time-background',colors.background);selected.style.setProperty('--time-foreground',colors.foreground);
  selected.title='Referência visual de leitura · previsto '+label(seconds)+' · cronômetro '+label(Math.floor(elapsed))+' · '+({early:'adiantado',late:'atrasado','on-time':'dentro da tolerância de 15 segundos'}[result.state]);
 }
 function locate(){const guide=Math.max(90,innerHeight*.32);selected=null;for(const node of readerNodes){if(!node.isConnected)continue;if(node.getBoundingClientRect().top<=guide)selected=node;else break;}}
 window.addEventListener('scroll',()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;locate();tick();});},{passive:true});
 window.addEventListener('resize',()=>{locate();tick();},{passive:true});
 return {handle(action){if(action==='time-mark'){editor();return true;}if(action==='time-mark-save'||action==='time-mark-remove'){apply(action==='time-mark-remove');return true;}return false;},refreshEditor,refreshReader,tick,
 readingOptions(){return `<label class="check-label"><input id="readTimeMarks" type="checkbox" ${c.getActive()?.read?.showTimeMarks!==false?'checked':''}>Mostrar marcações de tempo</label>`;},
 bindReading(){const input=$('#readTimeMarks');input?.addEventListener('change',()=>{c.getActive().read.showTimeMarks=input.checked;c.persist(true);refreshReader();});}};
}
