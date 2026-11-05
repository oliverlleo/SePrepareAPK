# SePrepare Android 1.0.70 — Controles da apresentação e remoção contextual

## Alterações

Mostrar tempo (relógio) e Mostrar ritmo (música) passam do menu Leitura para a barra da apresentação, junto de Ouvir, voz e anotações. São botões independentes com aria-pressed, nome acessível e título que alternam entre mostrar e ocultar. As preferências continuam nas propriedades read.showTimeMarks/showRhythms existentes, persistidas pelo armazenamento habitual. Falha ao salvar restaura o valor anterior. Nenhuma marcação é excluída ao ocultar.

Leitura foi renomeado para Ajustes, como ícone de regulagens. O painel mantém fonte, zoom, espaçamento, destaques, anotações, tema e páginas. Os controles de tempo e ritmo não são duplicados no painel.

Ouvir deixa de ocupar todo o espaço livre. Os seis controles usam uma única faixa, sem quebra nos rótulos. Ícones mantêm alvos de toque de 44 × 44 px. Abaixo de 360 px, Ouvir também usa apenas o ícone, preservando seu nome acessível. O painel do áudio e seus controles continuam existentes. O layout largo mantém o cronômetro e as ferramentas lado a lado, sem comprimir os textos dos botões.

No editor, o botão principal alterna entre Marcar tempo (relógio) e Remover tempo (lixeira) conforme a linha visual do cursor. Não é preciso tocar exatamente no caractere que contém a âncora. Um toque remove somente a referência daquela linha, preserva o texto e as outras referências. O botão volta para Marcar tempo quando a referência é removida ou o cursor muda para uma linha sem marca. O próprio controle mantém a seleção ao toque. Tocar num indicador também seleciona sua linha e atualiza o botão. A antiga ação secundária de remoção na faixa de contexto deixa de ser necessária.

O cálculo e as âncoras da 1.0.69 permanecem: tempo acumulado até o fim da linha visual do cursor, ritmos personalizados, indicador à direita, metadado inline speech-time-point e leitura das âncoras antigas speech-time. Desfazer/refazer e persistência seguem o histórico/Delta existente. O cronômetro existente continua sendo a única fonte de tempo na apresentação; rolagem não gera registros fictícios.

## Formatar e Desformatar

O botão principal detecta estilos no escopo atual e muda para Desformatar. Com seleção, remove os estilos desse trecho; sem seleção, remove de todo o texto. Usa a rotina existente de limpeza de estilos e mantém metadados de ritmo, anotação e tempo. A operação tem grupo próprio no histórico para desfazer/refazer sem unir a limpeza à edição anterior. Alterações de conteúdo, seleção, estilos e histórico atualizam o botão.

Os nomes dos atalhos da apresentação são medidos na fonte atual e aparecem apenas se a faixa inteira couber. ResizeObserver, fontes carregadas e mudanças de texto reavaliam o espaço; reduzir a largura restaura os ícones. Sem temporizador extra.

## Verificação

369 verificações de lógica em 23 suítes e 100 verificações Java aprovadas. O teste do aplicativo compilado com Quill em DOM isolado cobre inserção por linha, mudança contextual para remover em outro ponto da mesma linha, remoção sem perda de texto, atalhos independentes, persistência ao reabrir, ausência dos antigos checkboxes no painel Ajustes, preservação do cronômetro, cores e ritmos personalizados. As demais suítes verificam versões, compartilhamento, importação, índices e integridade dos metadados no backup.

Os testes de DOM usam geometria controlada; não são renderização em navegador/WebView. Não houve Android físico, motor visual real ou Google Drive real. A responsividade foi tratada no CSS, mas não se afirma conferência visual completa em dispositivos. O certificado original, versionCode, pacote, ausência de depuração, 67 recursos e modelo local completo são conferidos diretamente no APK. A chave privada e a senha não acompanham o ZIP.

## Escopo

Somente Android: 1.0.70, versionCode 71, br.com.orador.app. Nenhum APK do site, manifesto remoto, SePrepareApp ou SePrepareIphone é alterado. O JSON é entregue localmente e só deve ser ativado após publicar o APK na URL indicada. Outras plataformas ainda precisam de suporte próprio para editar/compartilhar as novas referências. Consulte COMPILAR-1.0.70.md para recompilar o projeto completo com a chave original.
