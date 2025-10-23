# monPonte

Este é um projeto do Firebase com um aplicativo de front-end Angular.

## Configuração do Desenvolvimento

### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 20.x ou superior)
- [Angular CLI](https://angular.io/cli) (versão 20.x ou superior)
- [Firebase CLI](https://firebase.google.com/docs/cli)

### Instalação

1.  Clone o repositório:
    ```sh
    git clone https://github.com/seu-usuario/mon-ponte.git
    cd mon-ponte
    ```

2.  Instale as dependências do front-end:
    ```sh
    cd frontend
    npm install
    ```

### Executando o Aplicativo

1.  Inicie o servidor de desenvolvimento do Angular:
    ```sh
    cd frontend
    npm start
    ```
    O aplicativo estará disponível em `http://localhost:4200/`.

2.  Para implantar no Firebase, use o Firebase CLI:
    ```sh
    firebase deploy
    ```

## Executando com Docker

Você também pode executar o aplicativo usando o Docker.

1.  Construa a imagem do Docker:
    ```sh
    docker build -t mon-ponte .
    ```

2.  Execute o contêiner:
    ```sh
    docker run -p 8080:80 mon-ponte
    ```
    O aplicativo estará disponível em `http://localhost:8080/`.
