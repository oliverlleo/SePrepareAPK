# Atualizações do SePrepare para Android

Este repositório contém o manifesto de atualização e poderá hospedar os APKs assinados nas Releases. As preparações dos usuários continuam no aparelho; a consulta de atualização não precisa enviar discursos, backups, conta Google ou tokens.

## Situação da configuração

O arquivo `update.json` foi criado. Ele está desativado (`enabled: false`) e usa como referência a versão 1.0.41, código 42, já entregue. Não anuncia uma versão inexistente.

O leitor do manifesto e o aviso na tela principal ainda precisam ser integrados ao código Android, compilados e entregues em um novo APK. Criar este arquivo não acrescenta essa função aos APKs já instalados.

O repositório estava privado durante a configuração. Para consulta direta pelos aplicativos sem autenticação, altere somente este repositório de distribuição para público em **Settings → General → Danger Zone → Change repository visibility**. O acesso usado para esta configuração não permite alterar a visibilidade.

Não publique aqui o ZIP privado do projeto, a pasta de assinatura ou credenciais. Para distribuir o aplicativo, basta o APK assinado e este manifesto.

## Endereço do manifesto

Depois que o repositório estiver público:

https://raw.githubusercontent.com/oliverlleo/SePrepareAPK/main/update.json

O endereço acima deve responder com o JSON sem exigir login.

## Publicar uma atualização

1. Gere o novo APK com o mesmo pacote e certificado das versões anteriores, aumentando o `versionCode`.
2. Publique o APK em uma Release deste repositório e confira o download.
3. Edite `update.json`: informe o novo código, nome da versão, endereço HTTPS direto do APK e SHA-256 do arquivo. Escreva uma nota curta em `releaseNotes`.
4. Somente depois de publicar o APK, altere `enabled` para `true` e salve na branch `main`.

Para suspender um aviso, use `enabled: false`. Preserve o arquivo para que o cliente receba uma resposta válida.

## Campos do JSON

| Campo | Uso |
| --- | --- |
| `schemaVersion` | Versão do formato, atualmente 1. |
| `enabled` | Liga ou suspende o anúncio. |
| `packageName` | Sempre `br.com.orador.app`. |
| `versionCode` | Inteiro do manifesto Android; é ele que determina se a atualização é mais nova. |
| `versionName` | Nome mostrado ao usuário. |
| `downloadUrl` | HTTPS do APK publicado; enquanto desativado, aponta para a página oficial de download. |
| `sha256` | SHA-256 do APK informado. |
| `releaseNotes` | Descrição curta em texto simples. |

## Contrato para a integração Android

- Consultar em segundo plano ao abrir o aplicativo, sem bloquear o caderno; não consultar continuamente durante o uso ou em segundo plano.
- Validar tamanho, formato, pacote, versão e endereço HTTPS; ignorar respostas incompletas ou inválidas.
- Mostrar o aviso apenas quando `enabled` for verdadeiro e o `versionCode` publicado for maior que o instalado. Comparar números de versão do Android, sem ordenar os nomes como texto.
- Exibir um aviso compacto na tela principal, integrado aos componentes existentes: **Nova atualização disponível**, versão, **Baixar atualização** e **Agora não**.
- Não interromper o editor, a apresentação ou um ensaio. Se a consulta terminar nessas telas, aguardar o retorno à tela principal.
- Respeitar **Agora não** durante a sessão e não repetir o aviso a cada renderização da tela.
- Abrir o download somente por iniciativa do usuário; a instalação continua sob controle do Android.
- Falta de internet, erro do GitHub ou ausência de atualização não devem exibir mensagens de falha nem modificar dados locais.

A integração no APK está pendente. Este documento registra o contrato a ser aplicado sem alterar as outras funcionalidades.
