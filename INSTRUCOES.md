
# Passos para o Setup Inicial

1. Acessar o Qwiklabs
2. Começar um "lab"
3. Salvar o usuário, senha e nome do projeto
4. No IDX: Configurar o gcloud com usuário, senha e nome do projeto
5. Ativar as APIs no projeto do GCloud: Text to Speech e Speech to Text (Gemini já deve estar ativado)
6. Rodar no terminal `gcloud auth login`
7. Rodar no terminal `gcloud auth application-default login`
8. Ir no aistudio.google.com e criar um API_KEY do Gemini e salvar no .env
9. Rodar no terminal `npm install`
10. Rodar no terminal `npm install ngrok -g`
11. Rodar no terminal `ngrok http 5000`
12. Rodar no terminal `npm run dev`
13. no dev.nix descomentar em `packages` o `pkgs.nodejs_20`




