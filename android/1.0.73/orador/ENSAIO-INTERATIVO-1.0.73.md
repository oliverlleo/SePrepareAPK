# Android 1.0.73 — Ensaio interativo

## Visão geral

Implementa o **Ensaio interativo** para Demonstrações com múltiplos participantes (`type === 'part'`) no modo Apresentação e no Modo Foco, preservando integralmente a faixa de seis controles centralizados da 1.0.72 e todos os recursos existentes.

## Arquitetura

- `web/src/interactive-rehearsal-core.js`: constrói o plano temporário de turnos a partir de `partSegments()` e da versão ativa, usando exclusivamente IDs de participantes, agrupando intervenções consecutivas, preservando quebras de página, removendo anotações privadas/marcadores de tempo da fala sintetizada, detectando trechos sem participante e gerando dicas progressivas em 3 níveis sem mutar o Delta.
- `web/src/interactive-rehearsal-audio.js`: distribui vozes disponíveis por participante com fallback seguro, preferências persistidas localmente por demonstração e proteção de sessão contra callbacks atrasados.
- `web/src/interactive-rehearsal-vad.js`: detecção local de atividade de voz (Web Audio API `AnalyserNode`) com calibração automática de ruído ambiente, histerese, espera obrigatória pelo início real da fala antes de contar silêncio (2 s, 3 s ou 5 s), sem gravação nem envio de áudio.
- `web/src/interactive-rehearsal-controller.js`: máquina de estados determinística (`idle`, `preparing`, `narrating`, `waiting-user`, `listening`, `paused`, `completed`, `error`), exclusão mútua com Ouvir/Testar voz, sincronização com o cronômetro e fallback imediato para o modo Manual preservando o turno atual.
- `web/src/interactive-rehearsal-ui.js` e `web/src/interactive-rehearsal.css`: entrada contextual em `.reader-identity`, modal de configuração inicial, configuração de vozes por participante, painel compacto de ensaio, memorização (`Ocultar minhas falas`) e atalho em Ajustes.
- `app/src/main/AndroidManifest.xml` e `MainActivity.java`: permissão opcional de microfone (`RECORD_AUDIO` com `android.hardware.microphone` `required="false"`) solicitada somente ao iniciar o modo Automático na origem interna `https://app.orador.local`.
