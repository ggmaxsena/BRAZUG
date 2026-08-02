import unittest
from unittest.mock import patch

from src.app.models.schemas import DonationRequest
from src.app.services.suno_service import (
    roll_dice,
    generate_prompt,
    extract_audio_tracks,
    process_suno_callback,
)
from src.app.data.store import TASKS


class SunoServiceTests(unittest.TestCase):
    def setUp(self):
        TASKS.clear()

    def test_roll_dice_returns_expected_fields(self):
        result = roll_dice()
        self.assertIn("d6_voz", result)
        self.assertIn("d6_estrutura", result)
        self.assertIn("d20_a", result)
        self.assertIn("d20_b", result)
        self.assertIn("voz", result)
        self.assertIn("estrutura", result)
        self.assertIn("estilo_a", result)
        self.assertIn("estilo_b", result)
        self.assertIn("mix", result)

    def test_generate_prompt_includes_donor_message_and_dice_mix(self):
        dados = roll_dice()
        prompt = generate_prompt("Maria", "tema de funk", dados)
        self.assertIn("tema de funk", prompt)
        self.assertIn("BRAZUG", prompt)
        self.assertIn("World of Warcraft Classic Hardcore", prompt)

    def test_generate_prompt_stays_within_suno_non_custom_limit(self):
        dados = roll_dice()
        prompt = generate_prompt("Maria", "tema de funk", dados)
        self.assertLessEqual(len(prompt), 500)

    def test_extract_audio_tracks_from_suno_response(self):
        payload = {
            "data": {
                "response": {
                    "sunoData": [
                        {"audioUrl": "https://example.com/song.mp3", "title": "Song"}
                    ]
                }
            }
        }
        tracks = extract_audio_tracks(payload)
        self.assertEqual(1, len(tracks))
        self.assertEqual("https://example.com/song.mp3", tracks[0]["audioUrl"])

    def test_process_suno_callback_updates_task(self):
        task = {
            "id": "task-123",
            "donor": "Test",
            "message": "Hello",
            "amount": 1.0,
            "currency": "BRL",
            "status": "pending",
        }
        from src.app.data.store import add_task
        from src.app.models.schemas import DonationTask, TaskStatus

        add_task(
            DonationTask(
                id=task["id"],
                donor=task["donor"],
                message=task["message"],
                amount=task["amount"],
                currency=task["currency"],
                status=TaskStatus.pending,
            )
        )

        with patch("src.app.services.suno_service.download_and_save") as download_mock:
            download_mock.return_value = __import__("pathlib").Path("musicas_geradas/demo.mp3")
            process_suno_callback(
                {
                    "code": 200,
                    "msg": "ok",
                    "data": {
                        "callbackType": "complete",
                        "task_id": task["id"],
                        "data": [{"audio_url": "https://example.com/song.mp3", "title": "Song"}],
                    },
                }
            )

        updated_task = next(item for item in TASKS if item.id == task["id"])
        self.assertEqual(TaskStatus.success, updated_task.status)
        self.assertIn("demo.mp3", updated_task.filename or "")
