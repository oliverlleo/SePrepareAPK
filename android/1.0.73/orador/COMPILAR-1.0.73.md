# Compilar SePrepare Android 1.0.73

Requisitos: Python 3, Node.js/npm, JDK 17 e Android SDK 35. Configure `JAVA_HOME` e `ANDROID_HOME`. Na pasta `web`, execute `npm ci`.

Use a chave original em `signing/orador-release.jks` e sua senha em `signing/password.txt`. Esses arquivos privados não acompanham o ZIP; o APK entregue já está assinado com o certificado original (`b1ef587e353569995f66837fa9571dd8c6545c8d23a309e24f90f36d3b541632`). Não gere uma chave nova para atualizar instalações anteriores.

Na pasta `orador`, execute `python build-apk.py`. O APK assinado é gerado na pasta acima como `SePrepare-1.0.73-ATUALIZACAO.apk`. O script valida o certificado original, o modelo semântico local integral e os assets web compilados. Versão `1.0.73`, código `74`, pacote `br.com.orador.app`.

Para executar os testes de DOM e Ensaio interativo:
1. `npm ci --prefix qa/time-dom`
2. Na pasta `web`, execute `npm run build && npm test && npm run test:time && npm run test:share-code && npm run test:audio && npm run test:playback && npm run test:voices && npm run test:incremental`
3. Testes Java nativos na pasta `orador`: `python verify-drive-native.py`, `python verify-drive-content.py`, `python verify-drive-controller.py` e `python verify-drive-identity.py`.

O JSON entregue localmente está preparado para a tag `v1.0.73`. Publique o APK na Release antes de atualizar o `update.json` remoto na branch `main`.
