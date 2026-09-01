from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
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
    sui_public_key = models.CharField(max_length=66, blank=True, null=True, unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name", "role"]

    objects = CustomUserManager()

    def __str__(self):
        return f"{self.full_name} ({self.role})"


class WalletChallenge(models.Model):
    class Purpose(models.TextChoices):
        AUTHENTICATE = "AUTHENTICATE", "Authenticate"
        BIND = "BIND", "Bind Wallet"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet_address = models.CharField(max_length=66, db_index=True)
    nonce = models.CharField(max_length=64, unique=True)
    domain = models.CharField(max_length=100, default="TerraNode Auth")
    purpose = models.CharField(max_length=30, choices=Purpose.choices, default=Purpose.AUTHENTICATE)
    message = models.TextField()
    issued_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, null=True, blank=True, related_name="challenges")

    class Meta:
        ordering = ['-issued_at']
        indexes = [
            models.Index(fields=['wallet_address', 'expires_at']),
        ]

    def is_valid(self):
        return self.used_at is None and timezone.now() < self.expires_at

    def __str__(self):
        return f"Challenge {self.id} for {self.wallet_address}"


class AuditEvent(models.Model):
    class EventType(models.TextChoices):
        AUTH_SUCCESS = "AUTH_SUCCESS", "Authentication Success"
        AUTH_FAILURE = "AUTH_FAILURE", "Authentication Failure"
        SECURITY_ALERT = "SECURITY_ALERT", "Security Alert / GCM Tag Mismatch"
        INTEGRITY_CHECK_PASS = "INTEGRITY_CHECK_PASS", "Integrity Audit Pass"
        INTEGRITY_CHECK_FAIL = "INTEGRITY_CHECK_FAIL", "Integrity Audit Failure"
        BATCH_PREPARE = "BATCH_PREPARE", "Batch Prepared"
        BATCH_CONFIRM = "BATCH_CONFIRM", "Batch Mint Confirmed"
        CUSTODY_TRANSFER = "CUSTODY_TRANSFER", "Custody Transferred"
        ADMIN_ACTION = "ADMIN_ACTION", "Administrative Action"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_type = models.CharField(max_length=40, choices=EventType.choices)
    user = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_events")
    wallet_address = models.CharField(max_length=66, blank=True, default="")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['event_type', 'timestamp']),
            models.Index(fields=['user', 'timestamp']),
        ]

    def __str__(self):
        return f"AuditEvent {self.id} ({self.event_type} at {self.timestamp})"
