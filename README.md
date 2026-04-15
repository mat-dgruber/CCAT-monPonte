# monPonte

Este é um projeto Firebase com uma aplicação front-end em Angular.

## Configuração de Desenvolvimento

### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 20.x ou superior)
- [Angular CLI](https://angular.io/cli) (versão 20.x ou superior)
- [Firebase CLI](https://firebase.google.com/docs/cli)

### Instalação

1. Clone o repositório:

   ```sh
   git clone <URL_DO_REPOSITORIO>
   cd monPonte
   ```

2. Instale as dependências do front-end:

   ```sh
   npm install --prefix frontend
   ```

### Configuração do Ambiente

1. Crie o arquivo `frontend/src/environments/environment.ts` com suas credenciais do Firebase:

   ```typescript
   export const environment = {
     production: false,
     firebase: {
       apiKey: "SUA_API_KEY",
       authDomain: "SEU_PROJETO.firebaseapp.com",
       projectId: "SEU_PROJETO",
       storageBucket: "SEU_PROJETO.appspot.com",
       messagingSenderId: "SEU_SENDER_ID",
       appId: "SEU_APP_ID"
     }
   };
   ```

### Executando a Aplicação

1. Inicie o servidor de desenvolvimento do Angular:

   ```sh
   npm start --prefix frontend
   ```
   A aplicação estará disponível em `http://localhost:4200/`.

### Implantação no Firebase

1. Faça o login no Firebase (se ainda não estiver logado):

   ```sh
   firebase login
   ```

2. Construa a aplicação e implante no Firebase:

   ```sh
   npm run build --prefix frontend
   firebase deploy
   ```

## Funcionalidades PWA (Progressive Web App)

O monPonte é um PWA completo, oferecendo uma experiência nativa em desktops e dispositivos móveis.

### Instalação
O aplicativo pode ser instalado diretamente pelo navegador:
- **Desktop (Chrome/Edge):** Clique no ícone de instalação na barra de endereço.
- **Mobile (Android/iOS):** Use a opção "Adicionar à Tela Inicial" no menu do navegador.

### Recursos Avançados
- **Badging API:** O ícone do aplicativo exibe contadores de notificações ou itens pendentes.
- **Screen Wake Lock:** O aplicativo pode manter a tela do dispositivo ativa durante o uso prolongado (útil para leituras longas).
- **Protocol Handlers:** Suporte a links profundos (deep linking) para abrir notas diretamente.

### Widgets do Windows
O monPonte suporta Widgets do Windows 11 para acesso rápido.

**Como ativar:**
1. Instale o monPonte como aplicativo (PWA) no Edge ou Chrome.
2. Abra o painel de Widgets do Windows (`Win + W` ou clique no ícone de clima na barra de tarefas).
3. Clique no ícone `+` (Adicionar Widgets).
4. Procure por "monPonte" ou "monClip".
5. Adicione o widget "monClip Acesso Rápido" para ter atalhos para o Clip e seus Cadernos diretamente no painel.

## Executando com Docker

Você também pode executar a aplicação usando o Docker.

1.  Construa a imagem do Docker:
    ```sh
    docker build -t mon-ponte .
    ```

2.  Execute o contêiner:
    ```sh
    docker run -p 8080:80 mon-ponte
    ```
    A aplicação estará disponível em `http://localhost:8080/`.
