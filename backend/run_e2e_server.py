"""Start an isolated migrated Django server for Playwright full-stack tests."""

import os
from pathlib import Path


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.e2e")

import django

django.setup()

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command


backend_dir = Path(__file__).resolve().parent
database_path = Path(settings.DATABASES["default"]["NAME"]).resolve()

if os.environ.get("E2E_RESET_DATABASE") == "1":
    expected_path = (backend_dir / ".e2e.sqlite3").resolve()
    if database_path != expected_path:
        raise RuntimeError(
            "Refusing to reset an E2E database outside backend/.e2e.sqlite3"
        )
    database_path.unlink(missing_ok=True)

call_command("migrate", interactive=False, verbosity=1)

admin_email = os.environ.get("E2E_ADMIN_EMAIL")
admin_password = os.environ.get("E2E_ADMIN_PASSWORD")
if admin_email and admin_password:
    User = get_user_model()
    User.objects.create_superuser(
        email=admin_email,
        password=admin_password,
        full_name="E2E Administrator",
        role=User.Role.ADMIN,
    )

call_command(
    "runserver",
    os.environ.get("E2E_SERVER_ADDRESS", "127.0.0.1:8001"),
    use_reloader=False,
)
