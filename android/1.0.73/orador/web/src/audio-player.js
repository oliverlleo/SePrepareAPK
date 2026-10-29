import {t,tr,h} from './i18n.js';
import {audioLocale,selectAudioVoice,voicesForLocale} from './audio-preferences.js';
import {clip,seekOffset,controlPosition} from './audio-playback-core.js';
import {catalogAvailability,catalogOptions} from './voice-catalog.js';

export function createAudioPlayer({native,rt,$,$$,icon,getSettings,getActive,toast,onProgress}){
  let suspended=null,scrubbing=false,drag=null,dragged=false,position=null,activeSegment=null,externalInterrupt=null;
  const token=()=>globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random();
  const ownsDocument=()=>!rt.audio.preview&&!!rt.audio.text&&rt.audio.speechId===getActive()?.id&&rt.audio.versionId===getActive()?.activeVersionId;
  const frame=()=>({left:window.visualViewport?.offsetLeft||0,top:window.visualViewport?.offsetTop||0,width:window.visualViewport?.width||innerWidth,height:window.visualViewport?.height||innerHeight});
  try{const saved=JSON.parse(localStorage.getItem('seprepare-audio-control-position'));if(Number.isFinite(saved?.x)&&Number.isFinite(saved?.y))position={x:clip(saved.x,0,1),y:clip(saved.y,0,1)};}catch{}
  const floating=document.createElement('button');floating.id='floatingAudioStop';floating.type='button';floating.className='audio-floating-stop';floating.hidden=true;
  floating.innerHTML=icon('Volume2')+icon('Square','audio-stop-symbol');document.body.append(floating);
  function place(){
    if(floating.hidden||drag)return;
    const f=frame(),size=floating.offsetWidth||52;
    if(!position){const bottom=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bottombar'))||72;const p=controlPosition({x:0,y:1},f,size);floating.style.left=p.x+'px';floating.style.top=Math.max(f.top+8,p.y-bottom-12)+'px';}
    else{const p=controlPosition(position,f,size);floating.style.left=p.x+'px';floating.style.top=p.y+'px';}
  }
  function updateFloating(){
    const tools=$('.reader-subtools'),rect=tools?.getBoundingClientRect(),f=frame();
    const controlsVisible=rt.view==='reader'&&ownsDocument()&&!rt.focus&&!$('.modal-backdrop')&&rect&&rect.bottom>f.top&&rect.top<f.top+f.height;
    floating.hidden=rt.audio.state!=='playing'||!!controlsVisible;
    floating.setAttribute('aria-label',t('Parar áudio'));floating.title=t('Parar áudio · arraste para mover');place();
  }
  function update(){
    const current=ownsDocument(),playing=current&&rt.audio.state==='playing';
    $$('[data-action="speak"]').forEach(button=>{button.innerHTML=icon(playing?'Pause':'Volume2')+h`<span>${playing?t('Pausar'):t('Ouvir')}</span>`;button.setAttribute('aria-label',playing?t('Pausar áudio'):current&&rt.audio.state==='paused'?t('Continuar áudio'):t('Ouvir texto em voz alta'));});
    const panel=$('#audioProgress'),range=$('#audioSeek');if(panel)panel.hidden=!current||!['playing','paused','finished'].includes(rt.audio.state);
    if(range&&current&&!scrubbing){const value=rt.audio.text.length?rt.audio.offset/rt.audio.text.length:0;range.value=String(Math.round(clip(value,0,1)*1000));showPosition(Number(range.value));}
    const test=$('[data-action="test-voice"]');if(test){const testing=rt.audio.preview&&rt.audio.state==='playing';test.innerHTML=icon(testing?'Square':'Play')+h`<span>${testing?t('Parar teste'):t('Testar voz')}</span>`;test.setAttribute('aria-pressed',String(!!testing));}
    updateFloating();onProgress();
  }
  function showPosition(value){const percent=Math.round(clip(value,0,1000)/10);const out=$('#audioSeekValue');if(out)out.textContent=percent+'%';$('#audioSeek')?.setAttribute('aria-valuetext',tr`${percent}% do texto`);}
  function invalidate(){const old=rt.audio.requestId;rt.audio.requestId=token();return old;}
  function stopActiveSegment(notifyInterrupt=false){
    const current=activeSegment;
    if(!current)return;
    activeSegment=null;
    if(native){if(native.stopSpeechSession)native.stopSpeechSession(current.requestId);else native.stopSpeaking();}
    else if('speechSynthesis'in window)speechSynthesis.cancel();
    if(notifyInterrupt&&typeof externalInterrupt==='function')externalInterrupt('audio-player');
  }
  function cancelEngine(){stopActiveSegment(false);const old=invalidate();if(native){if(native.stopSpeechSession)native.stopSpeechSession(old||'');else native.stopSpeaking();}else if('speechSynthesis'in window)speechSynthesis.cancel();}
  function restorePreview(){if(!rt.audio.preview)return false;if(suspended){rt.audio={...suspended,state:'paused',requestId:token()};suspended=null;}else rt.audio={state:'idle',offset:0,end:0,text:'',speechId:null,requestId:token()};return true;}
  function fail(message){if(rt.audio.preview)restorePreview();else rt.audio.state='paused';update();toast(message);}
  function play(){
    const audio=rt.audio;audio.requestId=token();const request=audio.requestId;audio.state='playing';audio.end=audio.offset;
    try{
      if(native){
        if(native.getVoiceCatalog){const availability=catalogAvailability(JSON.parse(native.getVoiceCatalog(audio.locale)),audio.locale,audio.voice);if(!availability.ready){fail(availability.message);return;}}
        const args=[audio.title,audio.text,audio.offset,audio.voice,Number(audio.rate),audio.locale];if(native.speakSession)native.speakSession(...args,request);else if(native.speakInLanguage)native.speakInLanguage(...args);else native.speak(...args.slice(0,5));
      }
      else if('speechSynthesis'in window){
        speechSynthesis.cancel();const available=speechSynthesis.getVoices(),selected=selectAudioVoice(available.map(v=>({name:v.name,locale:v.lang,offline:v.localService,default:v.default})),audio.locale,audio.voice);
        if(!selected){fail(t('Não há voz disponível para o idioma da leitura. Abra Ajustes de áudio para instalar ou escolher uma voz.'));return;}
        const offset=audio.offset,u=new SpeechSynthesisUtterance(audio.text.slice(offset));u.lang=selected.locale;u.voice=available.find(v=>v.name===selected.name&&v.lang===selected.locale);u.rate=Number(audio.rate);
        u.onboundary=e=>{if(rt.audio.requestId!==request||rt.audio.state!=='playing')return;rt.audio.offset=offset+e.charIndex;update();};
        u.onend=()=>{if(rt.audio.requestId!==request||rt.audio.state!=='playing')return;rt.audio.offset=rt.audio.text.length;rt.audio.state='finished';restorePreview();update();};
        u.onerror=()=>{if(rt.audio.requestId===request&&rt.audio.state==='playing')fail(t('Não foi possível reproduzir com essa voz. Escolha outra voz instalada.'));};speechSynthesis.speak(u);
      }else{fail(t('A leitura em voz alta está disponível no APK Android.'));return;}
    }catch{fail(t('Não foi possível reproduzir com essa voz. Escolha outra voz instalada.'));return;}
    update();
  }
  function pause(){cancelEngine();if(!restorePreview())rt.audio.state='paused';update();}
  function stop(){cancelEngine();if(!restorePreview())Object.assign(rt.audio,{state:'idle',offset:0,end:0});update();}
  function read({id,versionId,title,text}){
    stopActiveSegment(true);
    if(rt.audio.state==='playing'&&!rt.audio.preview&&rt.audio.speechId===id&&rt.audio.versionId===versionId){pause();return;}
    const previous=rt.audio,offset=!previous.preview&&previous.speechId===id&&previous.versionId===versionId&&previous.text===text?previous.offset:0;
    cancelEngine();suspended=null;const settings=getSettings();rt.audio={state:'idle',offset:offset>=text.length?0:offset,end:0,text,title,speechId:id,versionId,preview:false,locale:audioLocale(settings),voice:settings.voice||'',rate:Number(settings.rate)};play();
  }
  function preview(text,settings){
    stopActiveSegment(true);
    if(rt.audio.preview&&rt.audio.state==='playing'){stop();return;}
    if(!rt.audio.preview&&rt.audio.text)suspended={...rt.audio,state:'paused'};
    cancelEngine();
    rt.audio={state:'idle',offset:0,end:0,text,title:t('Teste de voz'),speechId:null,preview:true,locale:audioLocale(settings),voice:settings.voice||'',rate:Number(settings.rate)};play();
  }
  function getAvailableVoices(preferredLocale){
    const settings=getSettings()||{};
    const loc=preferredLocale||audioLocale(settings);
    try{
      if(native?.getVoiceCatalog){
        const cat=JSON.parse(native.getVoiceCatalog(loc));
        const all=catalogOptions(cat.voices||[],loc);
        const matching=voicesForLocale(cat.voices||[],loc).map(v=>all.find(o=>o.name===v.name)||({...v,label:v.name}));
        return {status:cat.status||'ready',locale:loc,voices:matching.length?matching:all,allVoices:all};
      }
      if(native?.getVoices){
        const raw=JSON.parse(native.getVoices());
        const all=catalogOptions(raw||[],loc);
        const matching=voicesForLocale(raw||[],loc).map(v=>all.find(o=>o.name===v.name)||({...v,label:v.name}));
        return {status:'ready',locale:loc,voices:matching.length?matching:all,allVoices:all};
      }
      if('speechSynthesis'in window){
        const raw=(speechSynthesis.getVoices()||[]).map(v=>({name:v.name,locale:v.lang,offline:v.localService!==false,default:v.default}));
        const all=catalogOptions(raw,loc);
        const matching=voicesForLocale(raw,loc).map(v=>all.find(o=>o.name===v.name)||({...v,label:v.name}));
        return {status:'ready',locale:loc,voices:matching.length?matching:all,allVoices:all};
      }
    }catch{}
    return {status:'unavailable',locale:loc,voices:[],allVoices:[]};
  }
  function speakSegment({title='',text='',offset=0,voice='',locale:preferredLocale='',rate=1,onStart,onBoundary,onEnd,onError,onPaused}){
    if(rt.audio.state==='playing'||rt.audio.preview){
      const old=invalidate();
      if(native){if(native.stopSpeechSession)native.stopSpeechSession(old||'');else native.stopSpeaking();}
      else if('speechSynthesis'in window)speechSynthesis.cancel();
      if(!restorePreview())rt.audio.state='paused';
      update();
    }
    stopActiveSegment(false);
    const settings=getSettings()||{};
    const loc=preferredLocale||audioLocale(settings);
    const reqId='rehearsal-'+token();
    const cleanRate=clip(Number(rate)||Number(settings.rate)||1,0.5,1.8);
    const seg={requestId:reqId,text:String(text||''),offset:clip(Number(offset)||0,0,String(text||'').length),started:false,onStart,onBoundary,onEnd,onError,onPaused};
    activeSegment=seg;
    try{
      if(native){
        let chosenVoice=String(voice||'');
        if(native.getVoiceCatalog){
          const cat=JSON.parse(native.getVoiceCatalog(loc));
          let availability=catalogAvailability(cat,loc,chosenVoice);
          if(!availability.ready&&chosenVoice){
            chosenVoice='';
            availability=catalogAvailability(cat,loc,'');
          }
          if(!availability.ready){
            activeSegment=null;
            onError?.({code:availability.kind||'voice-unavailable',message:availability.message});
            return null;
          }
        }
        const speakTitle=title||t('Ensaio interativo');
        if(native.speakSession)native.speakSession(speakTitle,seg.text,seg.offset,chosenVoice,cleanRate,loc,reqId);
        else if(native.speakInLanguage)native.speakInLanguage(speakTitle,seg.text,seg.offset,chosenVoice,cleanRate,loc);
        else native.speak(speakTitle,seg.text,seg.offset,chosenVoice,cleanRate);
        return reqId;
      }
      if('speechSynthesis'in window&&typeof SpeechSynthesisUtterance==='function'){
        speechSynthesis.cancel();
        const available=speechSynthesis.getVoices()||[];
        const mapped=available.map(v=>({name:v.name,locale:v.lang,offline:v.localService!==false,default:v.default}));
        const selected=(voice&&selectAudioVoice(mapped,loc,voice))||selectAudioVoice(mapped,loc,'');
        if(!selected&&available.length>0){
          activeSegment=null;
          onError?.({code:'language-unavailable',message:t('Não há voz disponível para o idioma da leitura. Abra Ajustes de áudio para instalar ou escolher uma voz.')});
          return null;
        }
        const u=new SpeechSynthesisUtterance(seg.text.slice(seg.offset));
        u.lang=selected?.locale||loc;
        const browserVoice=selected?available.find(v=>v.name===selected.name&&v.lang===selected.locale):null;
        if(browserVoice)u.voice=browserVoice;
        u.rate=cleanRate;
        u.onstart=()=>{if(activeSegment?.requestId!==reqId)return;seg.started=true;seg.onStart?.();};
        u.onboundary=e=>{if(activeSegment?.requestId!==reqId)return;const pos=clip(seg.offset+(Number(e.charIndex)||0),0,seg.text.length);seg.onBoundary?.({offset:pos,end:pos});};
        u.onend=()=>{if(activeSegment?.requestId!==reqId)return;activeSegment=null;seg.onEnd?.();};
        u.onerror=ev=>{if(activeSegment?.requestId!==reqId||ev?.error==='canceled'||ev?.error==='interrupted')return;activeSegment=null;seg.onError?.({code:ev?.error||'synthesis-failed',message:t('Não foi possível reproduzir com essa voz. Escolha outra voz instalada.')});};
        speechSynthesis.speak(u);
        return reqId;
      }
      activeSegment=null;
      onError?.({code:'synthesis-unavailable',message:t('A leitura em voz alta está disponível no APK Android.')});
      return null;
    }catch{
      activeSegment=null;
      onError?.({code:'synthesis-failed',message:t('Não foi possível reproduzir com essa voz. Escolha outra voz instalada.')});
      return null;
    }
  }
  function cancelSegment(reqId){
    if(!activeSegment||reqId&&activeSegment.requestId!==reqId)return;
    stopActiveSegment(false);
  }
  function setExternalInterruptHandler(fn){externalInterrupt=typeof fn==='function'?fn:null;}
  function seek(value){
    if(!ownsDocument())return;const playing=rt.audio.state==='playing';rt.audio.offset=seekOffset(rt.audio.text,clip(value,0,1000)/1000);rt.audio.end=rt.audio.offset;
    if(rt.audio.offset===rt.audio.text.length){cancelEngine();rt.audio.state='finished';update();}
    else if(playing){cancelEngine();play();}else{rt.audio.state='paused';update();}
  }
  function receive(data){
    if(activeSegment&&data.requestId&&data.requestId===activeSegment.requestId){
      const seg=activeSegment;
      if(data.state==='playing'){
        if(!seg.started){seg.started=true;seg.onStart?.();}
        const off=clip(data.offset,0,seg.text.length);
        seg.onBoundary?.({offset:off,end:clip(data.end||off,0,seg.text.length)});
      }else if(data.state==='finished'){
        activeSegment=null;seg.onEnd?.();
      }else if(data.state==='paused'){
        activeSegment=null;seg.onPaused?.();
      }else if(data.state==='error'){
        activeSegment=null;seg.onError?.({code:'synthesis-failed',message:data.message||t('Não foi possível reproduzir com essa voz. Escolha outra voz instalada.')});
      }
      return;
    }
    if(!rt.audio.text||data.requestId&&data.requestId!==rt.audio.requestId||!data.requestId&&native?.speakSession||rt.audio.state!=='playing')return;
    rt.audio.state=data.state;rt.audio.offset=clip(data.offset,0,rt.audio.text.length);rt.audio.end=clip(data.end||data.offset,0,rt.audio.text.length);
    if(['finished','error','paused'].includes(data.state)&&rt.audio.preview)restorePreview();update();if(data.message)toast(data.message);
  }
  document.addEventListener('input',event=>{if(event.target.id==='audioSeek'){scrubbing=true;showPosition(Number(event.target.value));}});
  document.addEventListener('change',event=>{if(event.target.id==='audioSeek'){scrubbing=false;seek(Number(event.target.value));}});
  document.addEventListener('pointercancel',event=>{if(event.target.id==='audioSeek'){scrubbing=false;update();}});
  floating.addEventListener('pointerdown',event=>{if(event.button!==0)return;const rect=floating.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top};dragged=false;floating.setPointerCapture(event.pointerId);});
  floating.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.hypot(dx,dy)>5)dragged=true;if(!dragged)return;event.preventDefault();
    const f=frame(),size=floating.offsetWidth||52,x=clip(drag.left+dx,f.left+8,f.left+f.width-size-8),y=clip(drag.top+dy,f.top+8,f.top+f.height-size-8);
    floating.style.left=x+'px';floating.style.top=y+'px';position={x:clip((x-f.left-8)/Math.max(1,f.width-size-16),0,1),y:clip((y-f.top-8)/Math.max(1,f.height-size-16),0,1)};
  });
  floating.addEventListener('pointerup',()=>{if(dragged&&position)try{localStorage.setItem('seprepare-audio-control-position',JSON.stringify(position));}catch{}drag=null;});
  floating.addEventListener('pointercancel',()=>{drag=null;dragged=false;place();});
  floating.addEventListener('click',event=>{if(dragged){event.preventDefault();dragged=false;return;}stop();});
  floating.addEventListener('keydown',event=>{if(!event.shiftKey||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const f=frame(),rect=floating.getBoundingClientRect();position={x:clip((rect.left-f.left-8+(event.key==='ArrowLeft'?-16:event.key==='ArrowRight'?16:0))/Math.max(1,f.width-68),0,1),y:clip((rect.top-f.top-8+(event.key==='ArrowUp'?-16:event.key==='ArrowDown'?16:0))/Math.max(1,f.height-68),0,1)};place();try{localStorage.setItem('seprepare-audio-control-position',JSON.stringify(position));}catch{}});
  window.addEventListener('scroll',updateFloating,{passive:true});window.addEventListener('resize',()=>{drag=null;updateFloating();});window.visualViewport?.addEventListener('resize',()=>{drag=null;updateFloating();});
  return {read,preview,pause,stop,receive,update,updateFloating,seek,getAvailableVoices,speakSegment,cancelSegment,setExternalInterruptHandler,stopPreview:()=>{if(rt.audio.preview)stop();},readerControls:()=>h`<div class="audio-progress" id="audioProgress" hidden><div class="range-line"><label for="audioSeek">Posição da leitura</label><output id="audioSeekValue">0%</output></div><input type="range" id="audioSeek" min="0" max="1000" step="1" value="0" aria-label="Avançar ou recuar a leitura"><small>Arraste para voltar ou avançar no texto.</small></div>`};
}
