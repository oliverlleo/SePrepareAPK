# Atualizações do SePrepare para Android

O leitor deste manifesto está integrado ao **APK 1.0.42, código 43**. Esse APK deve ser instalado uma vez para acrescentar a função a quem ainda usa a 1.0.41. Nas próximas versões, o aplicativo poderá avisar automaticamente quando este JSON anunciar uma atualização mais nova.

Este repositório público é destinado ao manifesto e à distribuição dos APKs assinados. O código-fonte privado e a chave de assinatura não precisam ser publicados aqui.

## Endereço consultado pelo APK

https://raw.githubusercontent.com/oliverlleo/SePrepareAPK/main/update.json

A consulta funciona sem login no GitHub. Ela não envia discursos, backups, tokens ou conta Google.

## Funcionamento

Ao abrir ou retornar ao primeiro plano, o aplicativo confere o manifesto em execução separada, com pelo menos 15 minutos entre tentativas na mesma sessão. Não fica consultando periodicamente enquanto o usuário continua usando o aplicativo ou o deixa em segundo plano.

Uma oferta válida de código maior aparece em um modal compacto na tela principal: **Atualização disponível**, versão, **Agora não** e **Baixar**. O aviso aguarda o editor, a apresentação, ensaios em andamento, áudio em reprodução, outras janelas e mensagens temporárias. A mesma versão não é reapresentada durante a sessão após fechar o aviso.

Baixar abre o endereço validado no navegador externo por escolha do usuário. A instalação fica sob controle do Android. Sem internet ou com resposta inválida, o aplicativo continua funcionando sem mensagem de erro.

## Estado atual do JSON

O arquivo registra a versão **1.0.42, código 43**, com o SHA-256 do APK entregue. O anúncio está suspenso com `enabled: false` até que esse APK seja publicado no endereço de download. Isso não desativa o leitor no aplicativo.

## Anunciar uma atualização

1. Compile o novo APK com o mesmo pacote e certificado, aumentando o `versionCode`.
2. Publique o APK em uma Release deste repositório ou no download oficial e confira o endereço.
3. Edite `update.json`: informe o novo código, o nome da versão, o endereço HTTPS do APK e seu SHA-256. Escreva uma nota curta em `releaseNotes`.
4. Depois de publicar o APK, defina `enabled: true` e salve na branch `main`.

Para suspender o aviso, altere `enabled` para `false`. Não apague o arquivo.

| Campo | Uso |
| --- | --- |
| `schemaVersion` | Versão do formato; atualmente 1. |
| `enabled` | Liga ou suspende o anúncio. |
| `packageName` | Sempre `br.com.orador.app`. |
| `versionCode` | Inteiro do manifesto Android; determina se a oferta é mais nova. |
| `versionName` | Nome da versão mostrado no aviso. |
| `downloadUrl` | HTTPS do domínio oficial ou de Releases do SePrepareAPK. |
| `sha256` | SHA-256 do APK informado. |
| `releaseNotes` | Texto curto, sem HTML. |

O código publicado precisa ser maior que o instalado. Por exemplo, um aparelho com código 43 recebe um anúncio de código 44, mas não de 43 ou 42. A diferença não é decidida pela ordenação textual do nome da versão.

O cliente limita o manifesto a 16 KiB e verifica pacote, formato, versão e endereço antes de aceitar a oferta. O SHA-256 identifica o arquivo; o download é realizado no navegador, e o Android verifica a assinatura ao instalar.

## O que publicar aqui

Somente o manifesto e os APKs destinados à distribuição. **Não envie o ZIP privado do projeto, a pasta de assinatura, senhas ou credenciais.** O ZIP de desenvolvimento contém a chave original necessária às futuras atualizações.

Esta integração é exclusiva do APK Android. Os repositórios SePrepareApp e SePrepareIphone não são alterados.
