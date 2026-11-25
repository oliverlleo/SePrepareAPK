# Marcar tempo — Android 1.0.69

## Comportamento final solicitado

Esta versão substitui o fluxo das versões 1.0.67/1.0.68: não há formulário de tempo, nem ao remarcar. O usuário posiciona o cursor e toca em Marcar tempo. O indicador aparece à direita da linha visual do cursor. O tempo acumulado inclui o texto desde o início do discurso até o fim dessa linha; não se limita ao começo do parágrafo nem inclui o restante dele.

timeLineEnd consulta getLine/getBounds do Quill e faz busca binária dentro do parágrafo para localizar a próxima linha visual. estimateRhythms calcula a duração do Delta até esse limite com os ritmos e velocidades existentes. Arredonda-se apenas o total. Não usa cronômetro nem rolagem para estimar a meta.

Linhas diferentes do mesmo parágrafo podem ter referências independentes. Remarcar outra posição na mesma linha substitui a referência dessa linha. Toque no indicador e em Remover para excluí-lo; Marcar tempo recalcula a linha selecionada. A faixa de ferramentas mostra Marcar tempo, Ritmo, Anotar, Formatar e Revisar, com indicador laranja apenas quando houver overflow.

## Dados e edição

Novas referências usam o atributo inline speech-time-point com valor segundos@identificador no caractere do cursor. O identificador evita a união de referências adjacentes com o mesmo tempo. Pares de caracteres Unicode são preservados. No final da linha/parágrafo, usa-se o caractere anterior quando adequado; parágrafos vazios usam a âncora de bloco legada speech-time. Marcas antigas continuam legíveis.

O Delta preserva as âncoras em edição anterior, desfazer/refazer, versões e duplicação. Sanitização e validação preservam ambos os atributos em exportação/importação e backup Android. As outras plataformas ainda precisam receber suporte de edição e compartilhamento; não se garante que editores antigos preservem atributos desconhecidos.

As metas são salvas. Alterar texto, ritmo, fonte ou largura não altera uma meta silenciosamente: a âncora segue sua posição no conteúdo e o indicador acompanha a nova linha; Marcar tempo recalcula o valor quando desejado. Não há número fixo de linha armazenado.

## Exibição e apresentação

Os indicadores ficam em camadas externas ao conteúdo editável e ao texto da apresentação. Nenhum tempo é inserido no texto narrado, copiado ou compartilhado como prosa. O editor reserva uma margem direita estável, evitando que criar a primeira marca altere a quebra de linha usada no cálculo. O modo Leitura reserva espaço quando as referências estão visíveis. ResizeObserver e atualizações agrupadas reposicionam as camadas.

O cronômetro existente é a única fonte de tempo: pausar mantém o valor, continuar retoma e zerar reinicia a comparação. Apenas a referência ativa recebe atualizações do cronômetro; futuras ficam neutras. Tolerância inclusiva de ±15 segundos; adiantamento laranja progressivo, atraso vermelho progressivamente escuro. Diferença disponível no indicador e detalhe no título. A opção Mostrar marcações de tempo em Leitura persiste e não remove dados.

A rolagem apenas escolhe a referência visual. Não grava chegada nem inventa histórico de ensaios. Não se cria segundo timer, serviço remoto ou política de backup.

## Verificação executada

361 verificações de lógica aprovadas em 23 suítes, incluindo aplicativo compilado com Quill em DOM isolado, além de 100 verificações Java. Casos incluem duas linhas no mesmo parágrafo, substituição na mesma linha, remoção, ritmos personalizados, versões, armazenamento, sanitização, apresentação, pausa/reset e ocultação. Contraste verificado em 101 amostras de cada gradação; extração de 100 referências em texto de 387.100 caracteres testada.

As posições visuais nos testes de DOM são fixtures controladas: não substituem renderização em WebView real. Não houve teste em Android físico, motor visual real ou Google Drive real. Não se afirma validação visual completa de celulares/tablets nem instalação sobre aparelho físico. O pacote, versão, assinatura e recursos foram verificados diretamente no APK.

## Entrega e escopo

Android 1.0.69, versionCode 70, br.com.orador.app, assinatura original conferida contra 1.0.68. APK sem depuração. Recursos e modelo local completos conferidos por SHA-256. ZIP contém fontes e instruções; chave privada e senha não são distribuídas. Não modifica SePrepareApp/SePrepareIphone, APKs do site nem update.json remoto. O JSON local está preparado para publicação futura do APK; seu endereço só funcionará após publicar o arquivo na release correspondente.
