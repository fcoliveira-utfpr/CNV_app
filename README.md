<<<<<<< HEAD
<div align="center">

# 🌱 Pausa CNV

**Um app Android de Comunicação Não Violenta** — registre observações, sentimentos, necessidades e pedidos, com sincronização direta para o Google Sheets.

![Platform](https://img.shields.io/badge/plataforma-Android-3ddc84?style=for-the-badge&logo=android&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)
![Bundler](https://img.shields.io/badge/bundler-esbuild-FFCF00?style=for-the-badge&logo=esbuild&logoColor=black)
![Status](https://img.shields.io/badge/status-projeto%20pessoal-8a6d3b?style=for-the-badge)
![License](https://img.shields.io/badge/licença-todos%20os%20direitos%20reservados-red?style=for-the-badge)

![Visitor count](https://visitor-badge.laobi.icu/badge?page_id=fcoliveira.pausa-cnv-app&left_color=grey&right_color=blue)

</div>

---

## Índice

- [O que é](#-o-que-é)
- [Telas](#-telas)
- [Como funciona a sincronização](#-persistência-e-sincronização)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Conectar com o Google Sheets](#-conectar-com-o-google-sheets-passo-que-só-você-pode-fazer)
- [Rodando o projeto](#-rodando-o-projeto)
- [Antes de publicar](#-antes-de-publicar)

---

## 📱 O que é

App de **Comunicação Não Violenta** (método de Marshall Rosenberg), empacotado como app Android nativo via [Capacitor](https://capacitorjs.com). Construído a partir de `cnv-app-prototype.html` (protótipo navegável de 4 telas), com a lógica ligada a persistência local **e** sincronização real com o Google Sheets — sem servidor, sem Apps Script, sem backend próprio.

CSS puro (sem Tailwind) e ícones em emoji — **zero dependência de CDN**. A interface inteira funciona 100% offline; só a sincronização com o Google Sheets precisa de internet.

> **Por que existe um build step (esbuild)?** O login do Google usa um plugin nativo do Capacitor (`@capawesome/capacitor-google-sign-in`) distribuído como ES modules. Como o app não usa framework/bundler algum, `npm run build` empacota `src/app.js` + esse plugin num único `www/js/app.js`, que o `index.html` carrega normalmente.

## 🖼️ Telas

| Tela | O que faz |
|---|---|
| 📝 **Registro** | Wizard de 4 passos (Observação → Sentimento → Necessidade → Pedido) + revisão antes de salvar. Cada campo de texto tem um botão de **ditado por voz** 🎤. |
| 📚 **Biblioteca** | Lista de referência de sentimentos e necessidades da CNV, com busca. |
| 📊 **Histórico** | Registros salvos, gráfico de frequência de sentimentos/necessidades, exportação CSV. |
| 🌿 **Aprender** | Dica do dia + conceitos da CNV em cards expansíveis. |
| ⚙️ **Configuração** | Bottom sheet — cola o link da planilha do Google Sheets, toca em "Entrar com Google" e autoriza. Sem Apps Script, sem copiar código. |

## 🔄 Persistência e sincronização

- Cada registro salvo (`doSave()` em `src/app.js`) é sempre gravado em `localStorage` (`cnv_entries`) — funciona mesmo offline ou sem conta conectada.
- Se houver planilha conectada, o app chama a **Google Sheets API v4** diretamente (`spreadsheets.values.append`), autenticado com o token de acesso obtido no login do Google (escopo `https://www.googleapis.com/auth/spreadsheets`). Sem servidor intermediário, sem Apps Script.
- Na primeira escrita, o app confere se a planilha já tem cabeçalho e cria automaticamente (`Data, Sentimentos, Necessidades, Observação, Pedido, Pedido para`) se estiver vazia.
- Se o token expirar (~1h), o app tenta re-autenticar silenciosamente e repete o envio uma vez.
- Cada pessoa entra com a própria conta Google e só escreve na própria planilha — não existe compartilhamento de credencial entre usuários.
- O **ditado por voz** usa o reconhecimento de fala nativo do Android (`@capacitor-community/speech-recognition`), em português, com escuta contínua até você tocar para parar.

## 📂 Estrutura do projeto

```
cnv_app/
├── di_rio_cnv.html          # protótipo inicial (single-screen, mantido como referência)
├── cnv-app-prototype.html   # protótipo de 4 telas (fonte visual do app atual)
├── src/app.js                # código-fonte da lógica (editar aqui)
├── www/                      # gerado a partir de src/ — não editar app.js aqui direto
│   ├── index.html            # telas: Registro, Biblioteca, Histórico, Aprender + config
│   └── js/app.js              # BUNDLE gerado por `npm run build` (esbuild) — não versionado
├── patches/                   # correções aplicadas a plugins via patch-package
├── capacitor.config.json     # appId, nome do app, pasta web
└── android/                  # projeto nativo Android gerado pelo Capacitor
```

## 🔐 Conectar com o Google Sheets (passo que só você pode fazer)

O login do Google exige um projeto no Google Cloud Console vinculado à sua conta — isso eu não consigo criar por você. São ~10 minutos, uma vez só:

<details>
<summary><strong>Ver o passo a passo completo</strong></summary>

1. Acesse [console.cloud.google.com](https://console.cloud.google.com) e crie um projeto novo (ou use um existente).
2. **APIs e Serviços → Biblioteca** → busque **Google Sheets API** → **Ativar**.
3. **APIs e Serviços → Tela de permissão OAuth**:
   - Tipo de usuário: **Externo**.
   - Preencha nome do app ("Pausa CNV"), e-mail de suporte e e-mail do desenvolvedor.
   - Em **Escopos**, adicione `https://www.googleapis.com/auth/spreadsheets`.
   - Em **Usuários de teste**, adicione o(s) e-mail(s) do Google que vão usar o app. Mantenha o app em modo **"Teste"** — não precisa passar pela verificação do Google para uso pessoal com até 100 usuários de teste.
4. **APIs e Serviços → Credenciais → Criar credenciais → ID do cliente OAuth**:
   - **Primeiro, tipo "Android"**:
     - Nome do pacote: `com.cnvdiario.app`
     - Impressão digital do certificado SHA-1: `F5:5A:D9:CC:DF:72:23:21:FF:EE:8B:CA:72:3E:BD:E3:FE:3D:5B:24`
       *(essa é a chave de debug gerada localmente nesta máquina, em `~/.android/debug.keystore` — serve pra testar. Quando for publicar na Play Store com uma chave de release, crie um segundo cliente Android com o SHA-1 dela.)*
   - **Depois, tipo "App da Web"** (sim, mesmo o app sendo Android — é assim que o plugin funciona):
     - Nome: o que quiser (ex: "Pausa CNV Web Client")
     - Não precisa preencher URIs de redirecionamento
     - **Copie o "ID do cliente"** gerado (termina em `.apps.googleusercontent.com`) — é esse valor que entra no app.
5. Abra [src/app.js](src/app.js) e troque a constante no topo do arquivo:
   ```js
   const GOOGLE_WEB_CLIENT_ID = "SUBSTITUA_PELO_SEU_WEB_CLIENT_ID.apps.googleusercontent.com";
   ```
   pelo Client ID copiado no passo anterior.
6. Rode `npm run cap:sync` pra rebuildar e reenviar pro projeto Android.

Depois disso, dentro do app: ⚙️ → cole o link de qualquer planilha do seu Drive → "Entrar com Google" → autorizar. Pronto.

</details>

## 🚀 Rodando o projeto

<details>
<summary><strong>Ambiente já instalado nesta máquina</strong></summary>

- Node.js v24.19.0 e Java (Temurin 21) — instalados localmente em `~/.local/` (sem precisar de senha de admin) e disponíveis via symlink em `/usr/local/bin`.
- Android Studio — instalado em `/Applications/Android Studio.app`.
- Capacitor 8 + os plugins de login do Google e ditado por voz já integrados ao projeto Android.

**Passo que só você pode fazer:** na primeira vez que o Android Studio abrir, ele mostra um "Setup Wizard" para baixar o Android SDK (~2-3 GB) e aceitar as licenças. Isso precisa de interação manual — deixe ele completar antes de rodar o app.

</details>

Depois de editar `src/app.js` ou `www/index.html`:

```bash
npm run android   # builda o JS, sincroniza com o projeto Android e abre o Android Studio
```

Ou passo a passo:

```bash
npm run build           # empacota src/app.js -> www/js/app.js
npx cap sync android    # copia www/ pra dentro do projeto nativo
npx cap open android    # abre no Android Studio
```

Ou direto num celular conectado por USB (com Depuração USB ativada), sem abrir o Android Studio:

```bash
npm run cap:sync
npx cap run android
```

Dentro do Android Studio, use o botão ▶ (Run) pra instalar no emulador ou no celular.

> ⚠️ O login do Google e o ditado por voz **só funcionam dentro do app instalado** (usam APIs nativas do Android) — abrir `www/index.html` direto no navegador serve só pra conferir o layout das outras telas.

## 📦 Antes de publicar

- [ ] **App ID**: hoje está como `com.cnvdiario.app` em `capacitor.config.json` — troque para o seu domínio reverso antes de publicar na Play Store (não dá pra mudar depois de publicado, e o cliente OAuth Android também precisa ser recriado com o novo nome de pacote).
- [ ] **SHA-1 de release**: ao gerar a chave de assinatura de release, registre um segundo cliente OAuth "Android" no Google Cloud com o SHA-1 dela — senão o login para de funcionar no APK assinado para produção.
- [ ] **Ícone**: o projeto usa o ícone padrão do Capacitor. Gere o seu com `npx @capacitor/assets generate` a partir de um PNG 1024×1024.
- [ ] **Nome do app**: `capacitor.config.json` → `appName`, e também em `android/app/src/main/res/values/strings.xml`.
- [ ] **Verificação do Google**: enquanto o app ficar em modo "Teste" na Tela de permissão OAuth, só os e-mails cadastrados como "usuários de teste" conseguem fazer login. Pra liberar pra qualquer pessoa, o app precisaria passar pela verificação do Google (processo à parte, só necessário se for distribuir publicamente).

## 📄 Licença

Todos os direitos reservados — veja [LICENSE](LICENSE). Uso, cópia ou distribuição deste código requerem autorização prévia do autor.

---

<div align="center">

Feito com 🌱 e Comunicação Não Violenta.

</div>
=======
# CNV_app
Aplicativo para contribuir com autoregulação e aprendizado de Comunicação Não Violenta (CNC). 
>>>>>>> d5145eacb07dd37888a239ebac8a4ad4fa6192c4
