from django.db import models
from django.conf import settings
import uuid

class ProduceBatch(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending Chain Confirmation"
        MINTED = "MINTED", "Minted on Sui"
        IN_TRANSIT = "IN_TRANSIT", "In Transit"
        DELIVERED = "DELIVERED", "Delivered"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    farmer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="batches")
    origin_telemetry = models.ForeignKey("telemetry.EnvironmentalTelemetry", on_delete=models.RESTRICT, related_name="batches", null=True, blank=True)
    crop_type = models.CharField(max_length=100)
    weight_kg = models.DecimalField(max_digits=10, decimal_places=2)
    data_integrity_hash = models.CharField(max_length=64, blank=True, default="")
    current_custodian = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.RESTRICT, related_name="custodial_batches")

    sui_object_id = models.CharField(max_length=66, blank=True, null=True, unique=True)
    sui_tx_digest = models.CharField(max_length=66, blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['farmer']),
        ]

    @property
    def weight_grams(self) -> int:
        return int(self.weight_kg * 1000)

    def __str__(self):
        return f"Batch {self.id} ({self.status})"


class CustodyTransfer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch = models.ForeignKey(ProduceBatch, on_delete=models.CASCADE, related_name="transfers")
    from_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.RESTRICT, related_name="transfers_sent")
    to_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.RESTRICT, related_name="transfers_received")
    from_wallet = models.CharField(max_length=66, blank=True, default="")
    to_wallet = models.CharField(max_length=66, blank=True, default="")
    tx_digest = models.CharField(max_length=66, blank=True, default="")
    verified_on_chain = models.BooleanField(default=False)
    transferred_at = models.DateTimeField(auto_now_add=True)
    event_metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-transferred_at']
        indexes = [
            models.Index(fields=['batch', 'transferred_at']),
        ]

    def __str__(self):
        return f"CustodyTransfer {self.id} for Batch {self.batch_id} ({self.from_user} -> {self.to_user})"
