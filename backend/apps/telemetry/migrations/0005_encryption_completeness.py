from django.db import migrations, models


def backfill_encrypted_at(apps, schema_editor):
    Telemetry = apps.get_model("telemetry", "EnvironmentalTelemetry")
    for record in Telemetry.objects.exclude(encrypted_payload_b64="").iterator():
        record.encrypted_at = record.created_at
        record.save(update_fields=["encrypted_at"])


class Migration(migrations.Migration):
    dependencies = [("telemetry", "0004_dataprovenance_environmentaltelemetry_auth_tag_b64_and_more")]

    operations = [
        migrations.AddField(
            model_name="environmentaltelemetry",
            name="encrypted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(backfill_encrypted_at, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="environmentaltelemetry",
            constraint=models.CheckConstraint(
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
        ),
    ]
