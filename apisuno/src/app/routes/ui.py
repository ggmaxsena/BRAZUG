from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from src.app.data.store import get_tasks

router = APIRouter()

@router.get("/control", response_class=HTMLResponse)
async def control_page(request: Request):
    tasks = get_tasks()
    rows = "\n".join(
        f"<tr><td>{task.id}</td><td>{task.donor}</td><td>{task.message}</td>"
        f"<td>{task.style or '-'}</td><td>{task.model or '-'}</td>"
        f"<td>{task.status}</td><td>{task.voice or '-'}<br/>{task.structure or '-'}<br/>{task.dice_summary or '-'}</td></tr>"
        for task in tasks
    )
    html = """
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Control Panel - Suno Live</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 24px; background: #121212; color: #f0f0f0; }
            .container { max-width: 1000px; margin: 0 auto; }
            h1 { margin-bottom: 16px; }
            form { display: grid; gap: 12px; background: #1f1f1f; padding: 18px; border-radius: 12px; }
            input, textarea, select, button { width: 100%; padding: 10px; border: 1px solid #333; border-radius: 8px; background: #181818; color: #f0f0f0; }
            button { background: #0078d4; color: #fff; border: none; cursor: pointer; }
            button:hover { background: #005a9e; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td { padding: 12px 8px; border-bottom: 1px solid #333; text-align: left; }
            th { background: #1e1e1e; }
            .small { font-size: 0.9rem; color: #bbb; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Control Panel - Suno Live</h1>
            <p class="small">Envie pedidos de música, veja tarefas e aguarde processamento.</p>
            <form id="donation-form">
                <input type="text" name="donor" placeholder="Nome do doador" required />
                <textarea name="message" rows="3" placeholder="Mensagem / tema da música"></textarea>
                <input type="number" name="amount" placeholder="Valor da doação" step="0.01" />
                <input type="text" name="currency" placeholder="Moeda" value="BRL" />
                <button type="submit">Enviar pedido</button>
            </form>
            <div id="status" class="small" style="margin-top: 12px; color: #a8e6cf;"></div>

            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Doador</th>
                        <th>Mensagem</th>
                        <th>Estilo</th>
                        <th>Modelo</th>
                        <th>Status</th>
                        <th>Arquivo</th>
                    </tr>
                </thead>
                <tbody>
                    {rows}
                </tbody>
            </table>
        </div>
        <script>
            const statusElement = document.getElementById('status');
            const tasksBody = document.querySelector('tbody');

            function createTaskRow(task) {
                const resultLink = task.result_url
                    ? `<div><a href="${task.result_url}" target="_blank">Download</a></div>`
                    : '';
                const failureLine = task.failure_reason
                    ? `<div style="color:#ff6b6b;">${task.failure_reason}</div>`
                    : '';
                return `
                    <tr>
                        <td>${task.id}</td>
                        <td>${task.donor}</td>
                        <td>${task.message}</td>
                        <td>${task.style || '-'}</td>
                        <td>${task.model || '-'}</td>
                        <td>${task.status}</td>
                        <td>${task.voice || '-'}<br/>${task.structure || '-'}<br/>${task.dice_summary || '-'}${resultLink}${failureLine}</td>
                    </tr>
                `;
            }

            async function refreshTasks() {
                try {
                    const response = await fetch('/api/tasks');
                    const tasks = await response.json();
                    tasksBody.innerHTML = tasks.map(createTaskRow).join('');
                } catch (error) {
                    console.error('Erro ao atualizar tarefas', error);
                }
            }

            document.getElementById('donation-form').addEventListener('submit', async function (event) {
                event.preventDefault();
                const formData = new FormData(event.target);
                const payload = {
                    donor: formData.get('donor'),
                    message: formData.get('message') || '',
                    amount: parseFloat(formData.get('amount') || 0),
                    currency: formData.get('currency') || 'BRL'
                };

                statusElement.textContent = 'Pedido enviado. Processando...';
                await fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                event.target.reset();
                await refreshTasks();
                setTimeout(() => statusElement.textContent = '', 5000);
            });

            refreshTasks();
            setInterval(refreshTasks, 8000);
        </script>
    </body>
    </html>
    """
    return html.replace('{rows}', rows)
