from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

from .managers import CustomUserManager

class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        FARMER = "FARMER", "Farmer"
        LOGISTICS = "LOGISTICS", "Logistics Handler"
        ADMIN = "ADMIN", "System Administrator"

    username = None
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=200)
    role = models.CharField(max_length=20, choices=Role.choices)
    sui_public_key = models.CharField(max_length=66, blank=True, null=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name", "role"]

    objects = CustomUserManager()

    def __str__(self):
        return f"{self.full_name} ({self.role})"
