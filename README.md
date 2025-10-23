# monPonte

Este é um projeto Firebase com uma aplicação front-end em Angular.

## Configuração de Desenvolvimento

### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 20.x ou superior)
- [Angular CLI](https://angular.io/cli) (versão 20.x ou superior)
- [Firebase CLI](https://firebase.google.com/docs/cli)

### Instalação

1.  Clone o repositório:
    ```sh
    git clone <URL_DO_REPOSITORIO>
    cd monPonte
    ```

2.  Instale as dependências do front-end:
    ```sh
    npm install --prefix frontend
    ```

### Executando a Aplicação

1.  Inicie o servidor de desenvolvimento do Angular:
    ```sh
    npm start --prefix frontend
    ```
    A aplicação estará disponível em `http://localhost:4200/`.

### Implantação no Firebase

1.  Faça o login no Firebase (se ainda não estiver logado):
    ```sh
    firebase login
    ```

2.  Construa a aplicação e implante no Firebase:
    ```sh
    npm run build --prefix frontend
    firebase deploy
    ```

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
