from .development import *


DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": env(
            "E2E_DATABASE_PATH",
            default=str(BASE_DIR / ".e2e.sqlite3"),
        ),
    }
}

ALLOWED_HOSTS = ["127.0.0.1", "localhost"]
