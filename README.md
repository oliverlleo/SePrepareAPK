# SePrepare para Android — atualizações no aplicativo

Este repositório público distribui o manifesto de atualização e os APKs assinados do SePrepare. O leitor e o download interno estão integrados ao **APK 1.0.42, código 43**. Instale esse APK uma primeira vez para acrescentar o recurso aos aparelhos que ainda não o têm.

## Onde fica o aplicativo atualizado

O APK fica como anexo de uma **Release pública deste repositório**. O campo `downloadUrl` do JSON deve conter o endereço direto desse arquivo `.apk`, como:

https://github.com/oliverlleo/SePrepareAPK/releases/download/v1.0.42/SePrepare-1.0.42-ATUALIZACAO.apk

A versão 1.0.42 está publicada nessa Release, com o SHA-256 do anexo conferido e o anúncio ativo em `update.json`. A página Baixar do site não participa deste fluxo.

## Manifesto consultado

https://raw.githubusercontent.com/oliverlleo/SePrepareAPK/main/update.json

A consulta funciona sem login no GitHub e não envia discursos, backups, tokens ou conta Google. O aplicativo consulta ao abrir ou retornar ao primeiro plano, com pelo menos 15 minutos entre tentativas na mesma sessão. Não faz consultas periódicas durante o uso nem enquanto permanece em segundo plano.

## Como o usuário atualiza

Uma versão mais nova gera um aviso compacto na tela principal com **Agora não** e **Atualizar**. O aviso aguarda o editor, a apresentação, ensaios em andamento, áudio, importação e outras janelas. Fechar evita repetir a mesma oferta durante a sessão.

**Atualizar baixa o APK dentro do SePrepare**, mostra o progresso e permite **Cancelar** ou **Ocultar**. Ocultar libera o uso do caderno enquanto o DownloadManager continua a transferência. Ao retornar, o aplicativo recupera o download existente.

Antes da instalação, o aplicativo confere uma cópia privada do arquivo: SHA-256, pacote, versão esperada e assinatura original. Arquivos incorretos não são instalados. O tamanho máximo é 256 MiB.

Quando o arquivo estiver pronto e o usuário estiver na tela principal, o SePrepare abre o instalador do Android. Se necessário, o Android solicita a permissão para instalar aplicativos desta origem. A confirmação final da atualização é obrigatória. Cancelar a instalação não abre tentativas repetidas; Instalar permite tentar novamente por escolha do usuário.

Não é necessário abrir uma página ou navegador, desinstalar o aplicativo ou apagar os dados.

## Publicar uma atualização

1. Aumente o `versionCode` e compile o APK com o mesmo pacote e certificado.
2. Anexe o APK à Release correspondente neste repositório.
3. Confira o download e seu SHA-256. Atualize `update.json` na branch `main`.
4. Ative `enabled: true` somente depois de o arquivo estar disponível. Use `false` para suspender o aviso.

| Campo | Uso |
| --- | --- |
| `schemaVersion` | Formato do manifesto; atualmente 1. |
| `enabled` | Ativa ou suspende o anúncio. |
| `packageName` | Sempre `br.com.orador.app`. |
| `versionCode` | Inteiro maior que o código instalado. |
| `versionName` | Nome da versão apresentado no aviso. |
| `downloadUrl` | HTTPS direto para o APK de uma Release do SePrepareAPK ou do domínio oficial. |
| `sha256` | SHA-256 do arquivo publicado. |
| `releaseNotes` | Nota curta, em texto simples. |

O manifesto é limitado a 16 KiB. Falhas de rede ou respostas inválidas não bloqueiam o aplicativo offline. O download segue os redirecionamentos normais do anexo do GitHub, mantendo a conferência do arquivo recebido.

## Dados que não devem ser publicados

Publique somente o manifesto e os APKs destinados à distribuição. **Não publique o ZIP privado do projeto, a pasta signing, senhas ou credenciais.** O ZIP contém a chave original de assinatura, necessária às próximas atualizações.

Esta integração é exclusiva do APK Android. SePrepareApp e SePrepareIphone não são modificados.
