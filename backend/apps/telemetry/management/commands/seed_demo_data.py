import math
import random
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.ledger.models import ProduceBatch
from apps.telemetry.encryption_service import encrypted_storage_fields
from apps.telemetry.models import DataProvenance, EnvironmentalTelemetry
from apps.users.models import CustomUser


class Command(BaseCommand):
    help = "Create explicitly labelled SYNTHETIC demo records. Never use as research evidence."

    def add_arguments(self, parser):
        parser.add_argument(
            "--allow-synthetic",
            action="store_true",
            help="Required acknowledgement that generated values are not genuine observations.",
        )
        parser.add_argument(
            "--password",
            required=True,
            help="Password assigned to the demo accounts; it is not stored in source control.",
        )
        parser.add_argument("--days", type=int, default=30)

    def handle(self, *args, **options):
        if not options["allow_synthetic"]:
            raise CommandError("--allow-synthetic is required")
        days = options["days"]
        if not 1 <= days <= 365:
            raise CommandError("--days must be between 1 and 365")

        with transaction.atomic():
            farmer, _ = CustomUser.objects.get_or_create(
                email="demo-farmer@terranode.invalid",
                defaults={"full_name": "Demo Farmer", "role": CustomUser.Role.FARMER},
            )
            logistics, _ = CustomUser.objects.get_or_create(
                email="demo-logistics@terranode.invalid",
                defaults={"full_name": "Demo Logistics", "role": CustomUser.Role.LOGISTICS},
            )
            farmer.set_password(options["password"])
            logistics.set_password(options["password"])
            farmer.save(update_fields=["password"])
            logistics.save(update_fields=["password"])

            provenance, _ = DataProvenance.objects.get_or_create(
                source_type=DataProvenance.SourceType.SYNTHETIC,
                provider_name="TerraNode demo generator",
                source_record_id=f"SYNTHETIC-DEMO-{days}-DAYS",
                defaults={
                    "dataset_name": "Procedurally generated demo telemetry",
                    "license_attribution": "Synthetic; not observational data",
                    "parameters_units": {
                        "temperature_celsius": "synthetic degrees Celsius",
                        "soil_moisture_percentage": "synthetic percentage",
                        "soil_ph": "synthetic pH",
                    },
                },
            )
            now = timezone.now()
            created = 0
            for day in range(days):
                recorded_at = (now - timedelta(days=day)).replace(
                    hour=12,
                    minute=0,
                    second=0,
                    microsecond=0,
                )
                rng = random.Random(f"terranode-demo:{recorded_at.date().isoformat()}")
                temperature = round(26 + 3 * math.sin(day / 10) + rng.uniform(-1, 1), 2)
                moisture = round(55 + 8 * math.cos(day / 7) + rng.uniform(-2, 2), 2)
                ph = round(6.4 + rng.uniform(-0.15, 0.15), 2)
                storage = encrypted_storage_fields(
                    farmer.pk,
                    recorded_at,
                    temperature,
                    moisture,
                    ph,
                )
                if EnvironmentalTelemetry.objects.filter(
                    payload_sha256=storage["payload_sha256"]
                ).exists():
                    continue
                EnvironmentalTelemetry.objects.create(
                    farmer=farmer,
                    recorded_at=recorded_at,
                    provenance=provenance,
                    **storage,
                )
                created += 1

            latest = EnvironmentalTelemetry.objects.filter(farmer=farmer).first()
            if latest:
                ProduceBatch.objects.get_or_create(
                    farmer=farmer,
                    crop_type="SYNTHETIC DEMO MAIZE",
                    defaults={
                        "weight_kg": 100,
                        "origin_telemetry": latest,
                        "data_integrity_hash": latest.payload_sha256,
                        "current_custodian": farmer,
                        "status": ProduceBatch.Status.PENDING,
                    },
                )

        self.stdout.write(
            self.style.WARNING(
                f"Created {created} SYNTHETIC telemetry rows. "
                "No fake Sui objects or transaction digests were created."
            )
        )
