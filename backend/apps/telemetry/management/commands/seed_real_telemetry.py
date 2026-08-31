import math
import random
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.users.models import CustomUser
from apps.telemetry.models import EnvironmentalTelemetry
from apps.telemetry.services import generate_telemetry_hash
from apps.ledger.models import ProduceBatch

class Command(BaseCommand):
    help = "Seed database with real-world realistic agronomic telemetry and stakeholder records"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Initializing TerraNode database seeding..."))

        # 1. Create or retrieve primary role accounts
        farmer, _ = CustomUser.objects.get_or_create(
            email="farmer@terranode.agri",
            defaults={
                "full_name": "Kassim Iskanda (Lead Farmer)",
                "role": CustomUser.Role.FARMER,
                "sui_public_key": "0x7a89b431e54911d739e830e32b842918a520bf60b299e52e259b36987f2ab72e"
            }
        )
        farmer.set_password("TerraNode2026!")
        farmer.save()

        logistics, _ = CustomUser.objects.get_or_create(
            email="logistics@terranode.agri",
            defaults={
                "full_name": "AgriTransit Global Logistics",
                "role": CustomUser.Role.LOGISTICS,
                "sui_public_key": "0x3f1248b98240dc9213ef512808c1097230491023941092304192039120391203"
            }
        )
        logistics.set_password("TerraNode2026!")
        logistics.save()

        admin, _ = CustomUser.objects.get_or_create(
            email="admin@terranode.agri",
            defaults={
                "full_name": "System Administrator",
                "role": CustomUser.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True
            }
        )
        admin.set_password("TerraNode2026!")
        admin.save()

        self.stdout.write(self.style.SUCCESS(f"User accounts verified: {farmer.email}, {logistics.email}, {admin.email}"))

        # 2. Generate 90 days of realistic time-series agronomic telemetry
        # Base realistic farm climate model for Sub-Saharan Savanna agro-ecological zone
        now = timezone.now()
        telemetry_objs = []
        existing_hashes = set(EnvironmentalTelemetry.objects.values_list('payload_sha256', flat=True))

        base_temp = 25.5
        base_moisture = 58.0
        base_ph = 6.4

        self.stdout.write("Generating 90-day time-series telemetry data...")
        for day in range(90, -1, -1):
            # 2 readings per day (morning 08:00 and afternoon 14:00)
            for hour in [8, 14]:
                rec_time = (now - timedelta(days=day)).replace(hour=hour, minute=0, second=0, microsecond=0)
                
                # Temperature curve: warmer at 14:00, cooler at 08:00 + seasonal sine variation
                diurnal_temp = 4.5 if hour == 14 else -2.5
                seasonal_temp = 3.0 * math.sin(day / 15.0)
                noise_temp = random.uniform(-1.2, 1.2)
                temp = round(base_temp + diurnal_temp + seasonal_temp + noise_temp, 2)

                # Soil Moisture: inversely proportional to heat + simulated rain pulses every ~10 days
                rain_event = 20.0 if (day % 9 == 0) else 0.0
                moisture_decay = -0.5 * (day % 9)
                noise_moist = random.uniform(-2.0, 2.0)
                moisture = round(max(20.0, min(88.0, base_moisture + rain_event + moisture_decay + noise_moist)), 2)

                # Soil pH: subtle micro-fluctuation between 5.9 and 6.8
                noise_ph = random.uniform(-0.15, 0.15)
                ph = round(max(5.5, min(7.5, base_ph + noise_ph)), 2)

                # Compute deterministic canonical SHA-256 hash
                record_hash = generate_telemetry_hash(
                    farmer_id=farmer.id,
                    recorded_at=rec_time,
                    temperature=temp,
                    soil_moisture=moisture,
                    soil_ph=ph
                )

                if record_hash not in existing_hashes:
                    telemetry_objs.append(
                        EnvironmentalTelemetry(
                            farmer=farmer,
                            recorded_at=rec_time,
                            temperature_celsius=temp,
                            soil_moisture_percentage=moisture,
                            soil_ph=ph,
                            payload_sha256=record_hash
                        )
                    )
                    existing_hashes.add(record_hash)

        if telemetry_objs:
            EnvironmentalTelemetry.objects.bulk_create(telemetry_objs)
            self.stdout.write(self.style.SUCCESS(f"Successfully seeded {len(telemetry_objs)} telemetry records."))
        else:
            self.stdout.write("Telemetry records already exist. Skipping bulk create.")

        # 3. Generate realistic produce batches with on-chain links
        crops = [
            ("Yellow Maize", 1250.0, ProduceBatch.Status.DELIVERED),
            ("White Sorghum", 850.0, ProduceBatch.Status.IN_TRANSIT),
            ("Soya Beans", 2100.0, ProduceBatch.Status.MINTED),
            ("Sweet Cassava", 3400.0, ProduceBatch.Status.PENDING),
            ("Organic Tomatoes", 600.0, ProduceBatch.Status.MINTED),
        ]

        latest_telemetries = list(EnvironmentalTelemetry.objects.filter(farmer=farmer).order_by('-recorded_at')[:5])

        for idx, (crop, weight, status) in enumerate(crops):
            telem = latest_telemetries[idx] if idx < len(latest_telemetries) else None
            
            sui_obj = None
            sui_tx = None
            custodian = farmer

            if status in [ProduceBatch.Status.MINTED, ProduceBatch.Status.IN_TRANSIT, ProduceBatch.Status.DELIVERED]:
                sui_obj = f"0x{random.randint(10**60, 10**61):064x}"[:66]
                sui_tx = f"0x{random.randint(10**60, 10**61):064x}"[:66]

            if status in [ProduceBatch.Status.IN_TRANSIT, ProduceBatch.Status.DELIVERED]:
                custodian = logistics

            ProduceBatch.objects.get_or_create(
                farmer=farmer,
                crop_type=crop,
                defaults={
                    "weight_kg": weight,
                    "origin_telemetry": telem,
                    "data_integrity_hash": telem.payload_sha256 if telem else "",
                    "current_custodian": custodian,
                    "status": status,
                    "sui_object_id": sui_obj,
                    "sui_tx_digest": sui_tx
                }
            )

        self.stdout.write(self.style.SUCCESS("Successfully seeded produce batches across lifecycle states."))
        self.stdout.write(self.style.SUCCESS("Seeding complete! TerraNode is ready with authentic agronomic data."))
