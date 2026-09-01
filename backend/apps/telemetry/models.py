from django.db import models
from django.conf import settings
import uuid


class DataProvenance(models.Model):
    class SourceType(models.TextChoices):
        MANUAL = "MANUAL", "Manual Observation"
        DATASET_IMPORT = "DATASET_IMPORT", "External Dataset Import"
        SENSOR = "SENSOR", "Hardware Sensor"
        SYNTHETIC = "SYNTHETIC", "Synthetic / Demo Data"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_type = models.CharField(max_length=30, choices=SourceType.choices, default=SourceType.MANUAL)
    provider_name = models.CharField(max_length=150, blank=True, default="")
    dataset_name = models.CharField(max_length=150, blank=True, default="")
    source_url = models.URLField(max_length=500, blank=True, default="")
    source_record_id = models.CharField(max_length=200, blank=True, default="")
    license_attribution = models.TextField(blank=True, default="")
    retrieval_timestamp = models.DateTimeField(auto_now_add=True)
    raw_payload_sha256 = models.CharField(max_length=64, blank=True, default="")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    time_standard = models.CharField(max_length=50, default="UTC")
    parameters_units = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["source_type", "provider_name", "source_record_id"],
                condition=~models.Q(source_record_id=""),
                name="telemetry_unique_external_source",
            ),
        ]

    def __str__(self):
        return f"Provenance {self.id} ({self.source_type} - {self.provider_name})"


class ImportRun(models.Model):
    class Status(models.TextChoices):
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        SUCCESS = "SUCCESS", "Success"
        PARTIAL = "PARTIAL", "Partial Import"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provenance = models.ForeignKey(DataProvenance, on_delete=models.CASCADE, related_name="import_runs")
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IN_PROGRESS)
    records_inserted = models.IntegerField(default=0)
    records_skipped = models.IntegerField(default=0)
    records_failed = models.IntegerField(default=0)
    validation_errors = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"ImportRun {self.id} ({self.status})"


class EnvironmentalTelemetry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    farmer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="telemetry")
    recorded_at = models.DateTimeField()

    # Legacy / Unencrypted plaintext columns (retained until explicit --clear-plaintext step)
    temperature_celsius = models.FloatField(null=True, blank=True)
    soil_moisture_percentage = models.FloatField(null=True, blank=True)
    soil_ph = models.FloatField(null=True, blank=True)

    # AES-256-GCM Encrypted Storage
    encrypted_payload_b64 = models.TextField(blank=True, default="")
    nonce_b64 = models.CharField(max_length=32, blank=True, default="")
    auth_tag_b64 = models.CharField(max_length=32, blank=True, default="")
    key_version = models.IntegerField(default=1)
    schema_version = models.IntegerField(default=1)
    encrypted_at = models.DateTimeField(null=True, blank=True)

    payload_sha256 = models.CharField(max_length=64, unique=True, editable=False)
    provenance = models.ForeignKey(DataProvenance, on_delete=models.SET_NULL, null=True, blank=True, related_name="telemetry_records")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['farmer', 'recorded_at']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(encrypted_payload_b64="")
                    | (
                        ~models.Q(nonce_b64="")
                        & ~models.Q(auth_tag_b64="")
                        & models.Q(encrypted_at__isnull=False)
                    )
                ),
                name="telemetry_encryption_fields_complete",
            ),
        ]

    def __str__(self):
        return f"Telemetry {self.id} for {self.farmer}"
