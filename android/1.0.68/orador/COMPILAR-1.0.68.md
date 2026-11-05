# Compilar SePrepare Android 1.0.68

Requisitos: Python 3, Node.js/npm, JDK 17 e Android SDK 35. Configure JAVA_HOME e ANDROID_HOME. Na pasta web, execute npm ci.

Use a chave original em signing/orador-release.jks e sua senha em signing/password.txt. Esses arquivos privados não acompanham o ZIP; o APK entregue já está assinado com o certificado original. Não gere uma chave nova para atualizar instalações anteriores.

Na pasta orador, execute python build-apk.py. O APK é gerado na pasta acima. O script exige o certificado original e o modelo local integral. Versão 1.0.68, código 69, pacote br.com.orador.app.

Para os testes de DOM, execute npm ci --prefix qa/time-dom. Na pasta web, execute npm run test:time após o build. Também execute os verificadores de versões, ritmos, notas, compartilhamento, armazenamento, índices e backup existentes. Testes Java: python verify-drive-native.py e python verify-drive-controller.py com JDK 17 no PATH.

O JSON entregue está preparado para a tag v1.0.68. Publique o APK antes de disponibilizar esse JSON remoto. Nenhum APK ou manifesto do site foi alterado nesta tarefa.
