# Suno FastAPI (esqueleto)

Dependências principais:

- fastapi
- uvicorn
- requests
- python-dotenv
- pygame
- obsws-python
- aiofiles

Instalação:

```bash
pip install -r requirements.txt
```

Executar em desenvolvimento:

```bash
uvicorn src.main:app --reload
```

Uso básico:

- Health: `GET /api/health`
- Listar tarefas: `GET /api/tasks`
- Criar tarefa: `POST /api/tasks` (JSON body com `donor`, `message`, `amount`, `currency`)
- Painel de controle: `GET /control`
- Arquivos gerados: `GET /music/{filename}`

Env:

- Copie `.env.example` para `.env` e ajuste as variáveis.
- Defina `CALLBACK_BASE_URL` para um URL público que possa receber POSTs da Suno.
