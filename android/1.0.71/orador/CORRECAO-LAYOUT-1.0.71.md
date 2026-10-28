# Android 1.0.71 — Correção do layout da apresentação

## Causa confirmada

O index.html da 1.0.70 carregava style.css antes de notes.css. A regra .reader-controls .reader-subtools em notes.css impunha display:grid e quatro colunas, com a mesma especificidade da nova regra. Por ser carregada depois, a grade prevalecia sobre a faixa flex. Os seis controles ocupavam duas linhas e a altura resultante esticava o cronômetro no layout largo. Os testes de DOM sem estilos não capturavam essa regressão visual.

## Correção

As regras antigas de distribuição dos controles foram removidas de notes.css. Os estilos novos do controle saíram de style.css e têm um único proprietário: presentation-controls.css, carregado por último no HTML e incluído no build oficial. Anotações mantêm seu funcionamento e suas regras de conteúdo.

Os seis atalhos usam uma faixa flex sem quebra, com alvos de 44 × 44 px. O cronômetro tem 46 px de altura, inclusive em andamento e com o botão de encerrar visível. No layout largo sua área fica limitada a 272 px e não acompanha a altura de outras linhas. No celular o cronômetro fica acima da faixa dos seis atalhos, que permanece em uma única linha. Em 320 px, os espaços entre atalhos são ajustados sem reduzir suas áreas de toque.

O código mede o espaço dos nomes na fonte atual. Se todos couberem, os nomes aparecem; se não couberem, ficam os ícones. Quando necessário, Ouvir também vira ícone. Os rótulos permanecem sem quebra. Os demais recursos e o conteúdo de leitura não são alterados.

## Verificação executada

377 verificações de lógica e da cascata de estilos aprovadas. A suíte nova lê o index.html e todos os CSS empacotados, na ordem real, e confirma que notes.css não recupera a grade de quatro colunas, que a faixa não quebra, que o cronômetro não estica e que os controles preservam seus tamanhos.

Conferência visual adicional no Microsoft Edge real, controlado pela ferramenta de navegador, usando os arquivos exatos do APK e dados fictícios em frames de 320, 360, 390, 600, 800 e 1024 px. Em cada largura foram medidos seis controles, mesma linha, ausência de sobreposição, contenção na faixa, alvos de toque e cronômetro de 46 px. Os nomes apareceram em 600 e 1024 px; nos demais casos ficaram os ícones. Também foi verificado o cronômetro em andamento com Encerrar ensaio.

Capturas de 320, 390 e 1024 px e relatório layout71-browser.json acompanham a entrega. Não houve teste em Android físico nem Drive real. As 100 verificações Java da base 1.0.70 foram preservadas, sem alteração de código Java nesta correção.

## Entrega

APK release 1.0.71, versionCode 72, br.com.orador.app, assinatura original conferida contra 1.0.70. Recursos e modelo local integral verificados por SHA-256. ZIP com fontes e instruções; chave e senha privadas excluídas. JSON local preparado para publicação futura do APK; não ativar a URL antes de disponibilizar o arquivo correspondente.

SePrepareApp e SePrepareIphone permanecem pausados a pedido do usuário, com alterações apenas locais e sem publicação. Nenhum APK do site nem manifesto remoto é modificado nesta correção.
