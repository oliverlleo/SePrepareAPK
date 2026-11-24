# Android 1.0.72 — Centralização e identificação dos controles

## Alterações

A faixa secundária usa justify-content:center. No celular, a soma das larguras dos controles é centralizada no espaço disponível. Em telas a partir de 800 px, o grupo completo do cronômetro com os atalhos é centralizado: reader-tools mede o espaço total disponível, calcula a largura necessária e a informa à grade por --reader-tools-width, sem deixar uma coluna vazia empurrar o conjunto para a esquerda. Mantidas a faixa única, as áreas de toque de 44 px e a altura de 46 px do cronômetro.

A ajuda contextual existente foi estendida aos botões de .reader-controls, .reader-top e .timer-dock. Obtém o nome acessível atual de cada controle, inclusive Mostrar/Ocultar tempo ou ritmo e o estado do cronômetro. Um toque prolongado de 550 ms mostra a identificação. O clique gerado ao soltar é suprimido; deslocamento do dedo maior que 9 px cancela a espera. Toques normais continuam imediatos. Foco pelo teclado e mouse também mostram a ajuda. O comportamento não depende do tooltip nativo de title do navegador.

## Verificação

381 verificações de lógica e cascata de estilos aprovadas. A suíte do aplicativo compilado contém casos de toque prolongado em Voz e velocidade, movimento que cancela a ajuda e toque prolongado no cronômetro sem iniciar ensaio. Também preserva os testes de marcação, remoção, estilos, versões e preferências.

Conferência visual adicional em Edge real controlado via CUA, com os arquivos exatos do APK, dados fictícios e larguras de 320, 360, 390, 600, 800 e 1024 px. Em todas, seis atalhos na mesma linha, contidos na faixa, sem sobreposição, alvos preservados e cronômetro de 46 px. O centro da faixa coincide com o centro dos botões. Em 800 e 1024 px, também foi conferido o centro do grupo completo. Captura de 390 px e captura da identificação visível de Voz e velocidade acompanham a entrega. O teste visual de identificação utilizou foco pelo teclado; os testes de toque usaram eventos de touch no DOM isolado. Não houve teste em Android físico ou Google Drive real.

## Entrega e escopo

Release 1.0.72, versionCode 73, br.com.orador.app, certificado original conferido contra 1.0.71. Recursos e modelo integral verificados no APK por SHA-256. O ZIP contém as fontes e as instruções; chave e senha privadas são excluídas. JSON entregue localmente, com URL preparada para a publicação posterior do APK.

SePrepareApp e SePrepareIphone continuam pausados, sem publicação das alterações locais. Nenhum APK do site ou manifesto remoto foi modificado.
