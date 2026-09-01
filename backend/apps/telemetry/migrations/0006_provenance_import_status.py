from django.db import migrations, models


def merge_duplicate_external_provenance(apps, schema_editor):
    Provenance = apps.get_model("telemetry", "DataProvenance")
    Telemetry = apps.get_model("telemetry", "EnvironmentalTelemetry")
    ImportRun = apps.get_model("telemetry", "ImportRun")
    groups = (
        Provenance.objects.exclude(source_record_id="")
        .values("source_type", "provider_name", "source_record_id")
        .annotate(count=models.Count("id"))
        .filter(count__gt=1)
    )
    for group in groups.iterator():
        matches = Provenance.objects.filter(
            source_type=group["source_type"],
            provider_name=group["provider_name"],
            source_record_id=group["source_record_id"],
        ).order_by("retrieval_timestamp", "id")
        keeper = matches.first()
        duplicate_ids = list(matches.exclude(pk=keeper.pk).values_list("pk", flat=True))
        Telemetry.objects.filter(provenance_id__in=duplicate_ids).update(provenance_id=keeper.pk)
        ImportRun.objects.filter(provenance_id__in=duplicate_ids).update(provenance_id=keeper.pk)
        Provenance.objects.filter(pk__in=duplicate_ids).delete()


class Migration(migrations.Migration):
    dependencies = [("telemetry", "0005_encryption_completeness")]

    operations = [
        migrations.AddField(
            model_name="dataprovenance",
            name="parameters_units",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AlterField(
            model_name="importrun",
            name="status",
            field=models.CharField(
                choices=[
                    ("IN_PROGRESS", "In Progress"),
                    ("SUCCESS", "Success"),
                    ("PARTIAL", "Partial Import"),
                    ("FAILED", "Failed"),
                ],
                default="IN_PROGRESS",
                max_length=20,
            ),
        ),
        migrations.RunPython(
            merge_duplicate_external_provenance,
            migrations.RunPython.noop,
        ),
        migrations.AddConstraint(
            model_name="dataprovenance",
            constraint=models.UniqueConstraint(
                condition=~models.Q(source_record_id=""),
                fields=("source_type", "provider_name", "source_record_id"),
                name="telemetry_unique_external_source",
            ),
        ),
    ]
