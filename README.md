# Sinal Escolar (Web + Mobile)

Aplicativo simples em formato web app (PWA) para tocar musicas MP3 por dia da semana e tocar sinal da escola.

## Funcionalidades

- Janela de horario fixa para musica:
  - inicio 07:30
  - termino 08:00
- Pasta de musicas por dia da semana (Seg a Sex)
- Leitura automatica da lista por arquivo `tracks.json` em cada pasta
- Reproducao aleatoria das musicas do dia
- Cadastro de horarios de sinal:
  - fixo: inicio 08:00
  - fixo: duracao 60 segundos
  - arquivo MP3 lido de `sounds/sinal/tracks.json` (primeiro item)
- Pastas de audio no projeto:
  - `sounds/musicas/Segunda-Quarta`
  - `sounds/musicas/Terca-Quinta`
  - `sounds/musicas/Sexta`
  - `sounds/sinal/`
- Funciona em celular via navegador e pode ser instalado como app (PWA)

## Estrutura

- `index.html`: interface
- `styles.css`: visual do app
- `app.js`: logica de agendamento
- `sounds/musicas/`: musicas MP3 por dia
- `sounds/sinal/`: sinal MP3

Neste app:
- As musicas sao arquivos MP3 locais do proprio projeto.
- O sistema escolhe faixas aleatorias dentro da lista do dia.
- O sinal (campainha) toca automaticamente com base nos horarios cadastrados.

## Como usar localmente

1. Coloque os MP3 de musica nas pastas:
  - `sounds/musicas/Segunda-Quarta`
  - `sounds/musicas/Terca-Quinta`
  - `sounds/musicas/Sexta`
2. Coloque o MP3 do sinal em `sounds/sinal/`.
3. Em cada pasta de dia, edite o arquivo `tracks.json` com os nomes dos arquivos MP3.
4. Em `sounds/sinal/tracks.json`, deixe o arquivo do sinal como primeiro item.
5. Abra o projeto com um servidor local (ex: Live Server no VS Code).
6. O painel ja vem com musica e sinal fixos (sem necessidade de digitacao).
7. Clique em `Iniciar agendador`.

## Publicar no GitHub Pages

1. Crie um repositorio no GitHub e envie os arquivos.
2. Em Settings > Pages, configure:
   - Source: `Deploy from a branch`
   - Branch: `main` (root)
3. Aguarde o link ser gerado e acesse de qualquer dispositivo.

## Exemplo de caminhos

- Pasta de Segunda e Quarta: `sounds/musicas/Segunda-Quarta`
- Pasta de Terca e Quinta: `sounds/musicas/Terca-Quinta`
- Pasta de Sexta: `sounds/musicas/Sexta`
- Arquivo de indice (exemplo): `sounds/musicas/Segunda-Quarta/tracks.json`
- Exemplo de `tracks.json`:

```json
[
  "musica1.mp3",
  "musica2.mp3"
]
```

- Sinal: `sounds/sinal/sinal.mp3`
- Exemplo de `sounds/sinal/tracks.json`:

```json
[
  "Sinal escolar.mp3"
]
```
