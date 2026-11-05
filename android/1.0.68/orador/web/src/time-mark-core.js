// A time reference is attached to the terminating newline of a paragraph.
// Quill carries that newline through edits before the paragraph and through
// undo/redo; deleting the paragraph also deletes the reference.
export const TIME_MARK_ATTRIBUTE='speech-time';
export const TIME_MARK_TOLERANCE=15;
export const TIME_MARK_GRADIENT=105;
export function parseTimeMark(value){
 if(typeof value!=='string'||!/^\d{1,6}$/.test(value))return null;
 const seconds=Number(value);
 return Number.isSafeInteger(seconds)&&seconds<=999999?seconds:null;
}
export function timeMarkValue(minutes,seconds){
 if(!Number.isSafeInteger(minutes)||minutes<0||!Number.isSafeInteger(seconds)||seconds<0||seconds>59)throw Error('Informe minutos e segundos válidos.');
 const total=minutes*60+seconds;
 if(!Number.isSafeInteger(total)||total>999999)throw Error('O tempo informado é muito grande.');
 return String(total);
}
export function formatTimeMark(seconds){
 if(!Number.isSafeInteger(seconds)||seconds<0)throw Error('Tempo inválido.');
 return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
}
export function compareTimeMark(expected,elapsed,tolerance=TIME_MARK_TOLERANCE){
 if(![expected,elapsed,tolerance].every(Number.isFinite)||expected<0||elapsed<0||tolerance<0)throw Error('Tempo inválido.');
 const difference=elapsed-expected;
 if(Math.abs(difference)<=tolerance)return {state:'on-time',difference,intensity:0};
 return {state:difference<0?'early':'late',difference,intensity:Math.min(1,(Math.abs(difference)-tolerance)/TIME_MARK_GRADIENT)};
}
export function timeMarkColors(state,intensity){
 const amount=Math.max(0,Math.min(1,intensity));
 const blend=(a,b)=>'#'+a.map((value,i)=>Math.round(value+(b[i]-value)*amount).toString(16).padStart(2,'0')).join('');
 if(state==='early')return {background:blend([255,226,187],[246,168,138]),foreground:'#602500'};
 if(state==='late'){
  const background=blend([252,219,215],[123,27,28]);
  const luminance=hex=>{const c=hex.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
  const light=luminance(background),dark=luminance('#190205');
  return {background,foreground:(light+.05)/(dark+.05)>=1.05/(light+.05)?'#190205':'#ffffff'};
 }
 return {background:'#dcebdc',foreground:'#234d2c'};
}
export function timeMarks(delta){
 let position=0;const result=[];
 for(const op of delta?.ops||[]){
  const text=typeof op.insert==='string'?op.insert:null,seconds=parseTimeMark(op.attributes?.[TIME_MARK_ATTRIBUTE]);
  if(seconds!==null&&text!==null)for(let i=0;i<text.length;i++)if(text[i]==='\n')result.push({position:position+i,seconds});
  position+=text===null?1:text.length;
 }
 return result;
}
