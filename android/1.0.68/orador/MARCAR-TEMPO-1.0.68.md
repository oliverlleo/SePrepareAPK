# Marcar tempo — Android 1.0.68

## Uso

No editor, posicione o cursor em um parágrafo e toque em Marcar tempo. A referência é criada imediatamente, sem formulário obrigatório. O cálculo usa estimateRhythms do próprio aplicativo sobre o Delta anterior ao início do parágrafo; soma palavras × 60 / PPM nos trechos, incluindo os ritmos personalizados aplicados. Arredonda somente o total para o segundo mais próximo. O primeiro parágrafo recebe 00:00. A estimativa não usa o cronômetro nem a posição da rolagem.

Ao tocar novamente em uma marca, abre-se a edição opcional, com Recalcular pelo texto, Remover e Salvar marcação. A referência é uma meta persistida; mudanças no texto ou no ritmo não sobrescrevem a meta silenciosamente. Recalcular obtém o valor atual do mesmo estimador. Exemplo testado: 100 palavras no padrão 125 PPM (48 s) e 50 palavras no ritmo personalizado 100 PPM (30 s) resultam em 01:18.

A faixa inferior mostra Marcar tempo, Ritmo, Anotar, Formatar e Revisar. Permanece visível nos layouts de celular e tablet. Os cinco controles dividem o espaço e respeitam largura mínima de toque; em telas compactas, ícone e rótulo são empilhados. O mesmo componente de indicador laranja da barra superior também observa essa faixa e aparece somente se houver overflow. Não há duplicação do botão de tempo na barra superior.

Na apresentação, o ponto mais recente que passou pela região de leitura (32% da altura da tela, mínimo 90 px do topo) serve como referência visual. Ao voltar o texto, a referência muda novamente; isso não confirma chegada. As demais referências ficam neutras. O cronômetro existente fornece o tempo: iniciar, pausar, continuar, encerrar e zerar seguem seus controles atuais. A opção Mostrar marcações de tempo está em Leitura e é persistida no read do documento, no mesmo escopo das preferências de leitura atuais.

## Dados e integração

As referências ficam no atributo opcional `speech-time` da quebra de parágrafo do Delta do Quill, com segundos inteiros como string. Não são texto comum nem números fixos de linha. O Attributor é BLOCK. As referências acompanham o Delta nas operações, no histórico de edição, nas versões e nas cópias. Ao dividir parágrafos, a herança de formatação de bloco segue o comportamento do Quill; confira as referências do trecho dividido. Exclusão da quebra que contém a referência remove aquela referência. O conteúdo original permanece completo nos filtros de participantes.

O sanitizador HTML aceita o atributo explicitamente; a conversão para apresentação usa o Quill original. O compartilhamento em arquivo e código preserva o atributo pelo filtro existente. Preferências de visibilidade usam o campo opcional read.showTimeMarks. JSON, índice incremental e assinatura incluem o novo atributo sem nova política de backup ou de conflitos. Não foram adicionados serviços, backend ou um segundo cronômetro.

As cores e limites estão em time-mark-core.js: tolerância inclusiva ±15 s, gradação até 105 s além da tolerância. O atraso escurece até bordô e a escolha de texto claro/escuro mantém contraste mínimo 4,5:1. CSS mostra um indicador na margem interna, sem inserir caracteres, com espaço reservado uniforme; animação respeita redução de movimento. O timer atualiza somente a referência ativa; a leitura das posições ocorre na montagem, rolagem ou redimensionamento, sem reconstruir o discurso a cada atualização.

## Ensaios

Não foi implementada coleta automática de chegada: a rolagem não é evidência confiável de apresentação. O histórico existente é mantido. A função central de comparação já oferece previsto, diferença e estado para uma ampliação futura com eventos confiáveis.

## Compatibilidade entre plataformas

Implementação e APK somente Android. Os repositórios e os APKs do site não foram alterados. As versões atuais de Web/Windows e Apple validam o JSON com atributos opcionais, mas ainda não registram esse Attributor no editor e seus filtros de compartilhamento podem remover o atributo. Antes de garantir edição/compartilhamento completos nelas, portar: registro BLOCK, sanitizador, filtro sharing.js, UI e preferência de Leitura. Backup completo contendo o atributo não equivale a suporte de edição nessas versões. O texto permanece legível; mantenha a edição das referências no Android atualizado e conserve o backup original.

## Verificação e limites

- Aplicativo compilado e Quill reais executados em DOM isolado: criação, edição, validação, remoção, salvamento nativo simulado, apresentação, cores/cronômetro, pausa, zerar, visibilidade e ausência de exceções.
- Testes de metadados: inserir antes, exclusão, desfazer, versões independentes, duplicação, arquivo e código de compartilhamento, restauração JSON, assinatura e recuperação idempotente.
- Contraste e gradação em 101 pontos; limites inclusivos e documento de 387.100 caracteres com cem referências.
- Suítes Android de regressão e testes Java do transporte/controlador existentes.

Os testes usam DOM isolado e transporte Google simulado/HTTP local. Não foram realizados testes em Android físico, motor de layout de navegador, gestos reais ou Google Drive real nesta entrega. O DOM verifica comportamento, não comprova layout ou responsividade em hardware. A conferência dessas condições continua necessária para validar visualmente aparelhos específicos.
