# Android 1.0.73 — Ensaio interativo

## Visão geral

Implementa o **Ensaio interativo** para Demonstrações com múltiplos participantes (`type === 'part'`) no modo Apresentação e no Modo Foco, preservando integralmente a faixa de seis controles centralizados da 1.0.72 e todos os recursos existentes.

## Arquitetura

- `web/src/interactive-rehearsal-core.js`: constrói o plano temporário de turnos a partir de `partSegments()` e da versão ativa, usando exclusivamente IDs de participantes, agrupando intervenções consecutivas, preservando quebras de página, removendo anotações privadas/marcadores de tempo da fala sintetizada, detectando trechos sem participante e gerando dicas progressivas em 3 níveis sem mutar o Delta.
- `web/src/interactive-rehearsal-audio.js`: distribui vozes disponíveis por participante com fallback seguro, preferências persistidas localmente por demonstração e proteção de sessão contra callbacks atrasados.
- `web/src/interactive-rehearsal-vad.js` e `app/src/main/java/br/com/orador/app/MicMonitor.java`: detecção local de atividade de voz em memória volátil. No Android (`OradorNative`), usa `AudioRecord` nativo (liberando o hardware imediatamente durante as falas do TTS sem conflito de rota de áudio) com fallback para Web Audio API; na Web/PWA usa `AnalyserNode` com desbloqueio síncrono de `AudioContext` e fallback progressivo de constraints em `getUserMedia`. Calibração automática de ruído, histerese e espera obrigatória pelo início real da fala antes de contar silêncio (2 s, 3 s ou 5 s), sem gravação nem envio de áudio.
- `web/src/interactive-rehearsal-controller.js`: máquina de estados determinística (`idle`, `preparing`, `narrating`, `waiting-user`, `listening`, `paused`, `completed`, `error`), exclusão mútua com Ouvir/Testar voz, sincronização com o cronômetro e fallback imediato para o modo Manual preservando o turno atual.
- `web/src/interactive-rehearsal-ui.js` e `web/src/interactive-rehearsal.css`: entrada contextual em `.reader-identity`, modal de configuração inicial, configuração de vozes por participante, painel compacto de ensaio, memorização (`Ocultar minhas falas`) e atalho em Ajustes.
- `app/src/main/AndroidManifest.xml`, `MainActivity.java` e `MicMonitor.java`: permissões de áudio (`RECORD_AUDIO` e `MODIFY_AUDIO_SETTINGS`, com `android.hardware.microphone` `required="false"`) solicitadas somente ao iniciar o modo Automático.
