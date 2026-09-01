import hashlib
import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone as dt_timezone
from decimal import Decimal
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from apps.users.models import CustomUser
from apps.telemetry.models import EnvironmentalTelemetry, DataProvenance, ImportRun
from apps.telemetry.services import generate_telemetry_hash

GHANA_PRESETS = {
    "accra": {
        "name": "Accra (Greater Accra Reference)",
        "latitude": Decimal("5.5593"),
        "longitude": Decimal("-0.1974")
    },
    "kumasi": {
        "name": "Kumasi (Ashanti Region Reference)",
        "latitude": Decimal("6.6885"),
        "longitude": Decimal("-1.6244")
    },
    "tamale": {
        "name": "Tamale (Northern Region Reference)",
        "latitude": Decimal("9.4008"),
        "longitude": Decimal("-0.8393")
    },
    "sunyani": {
        "name": "Sunyani (Bono Region Reference)",
        "latitude": Decimal("7.3349"),
        "longitude": Decimal("-2.3123")
    }
}

class Command(BaseCommand):
    help = "Import genuine meteorological observations from NASA POWER API idempotently."

    def add_arguments(self, parser):
        parser.add_argument("--farmer-email", type=str, required=True, help="Farmer email account to associate telemetry with")
        parser.add_argument("--preset", type=str, choices=list(GHANA_PRESETS.keys()), help="Ghana city-centre reference preset")
        parser.add_argument("--latitude", type=float, help="Latitude coordinate")
        parser.add_argument("--longitude", type=float, help="Longitude coordinate")
        parser.add_argument("--start", type=str, required=True, help="Start date YYYYMMDD")
        parser.add_argument("--end", type=str, required=True, help="End date YYYYMMDD")

    def handle(self, *args, **options):
        farmer_email = options["farmer_email"]
        try:
            farmer = CustomUser.objects.get(email=farmer_email)
        except CustomUser.DoesNotExist:
            raise CommandError(f"User with email '{farmer_email}' does not exist.")

        preset = options.get("preset")
        latitude = options.get("latitude")
        longitude = options.get("longitude")

        if preset:
            preset_data = GHANA_PRESETS[preset]
            lat_dec = preset_data["latitude"]
            lon_dec = preset_data["longitude"]
            location_label = f"Ghana Preset: {preset_data['name']}"
            self.stdout.write(self.style.NOTICE(f"Using {location_label} ({lat_dec}, {lon_dec})"))
        elif latitude is not None and longitude is not None:
            lat_dec = Decimal(str(latitude))
            lon_dec = Decimal(str(longitude))
            location_label = f"Custom Coordinates ({lat_dec}, {lon_dec})"
        else:
            raise CommandError("Must supply either --preset (accra, kumasi, tamale, sunyani) or both --latitude and --longitude.")

        start_date = options["start"]
        end_date = options["end"]

        base_url = "https://power.larc.nasa.gov/api/temporal/daily/point"
        params = {
            "parameters": "T2M,PRECTOTCORR",
            "community": "AG",
            "longitude": str(lon_dec),
            "latitude": str(lat_dec),
            "start": start_date,
            "end": end_date,
            "format": "JSON"
        }
        query_string = urllib.parse.urlencode(params)
        req_url = f"{base_url}?{query_string}"

        self.stdout.write(f"Fetching NASA POWER observations from: {req_url}")

        req = urllib.request.Request(req_url, headers={"User-Agent": "TerraNode-Ingestion-Engine/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                raw_data = response.read()
        except Exception as e:
            raise CommandError(f"Failed to fetch data from NASA POWER API: {e}")

        raw_sha256 = hashlib.sha256(raw_data).hexdigest()
        data_json = json.loads(raw_data.decode("utf-8"))

        properties = data_json.get("properties", {})
        parameter_dict = properties.get("parameter", {})
        t2m_dict = parameter_dict.get("T2M", {})

        provenance = DataProvenance.objects.create(
            source_type=DataProvenance.SourceType.DATASET_IMPORT,
            provider_name="NASA POWER (Prediction Of Worldwide Energy Resources)",
            dataset_name="POWER Daily Point AG",
            source_url=req_url,
            source_record_id=f"NASAPOWER_{lat_dec}_{lon_dec}_{start_date}_{end_date}",
            license_attribution="NASA POWER Data Terms of Use (Public Domain Open Data)",
            raw_payload_sha256=raw_sha256,
            latitude=lat_dec,
            longitude=lon_dec,
            time_standard="UTC"
        )

        import_run = ImportRun.objects.create(
            provenance=provenance,
            status=ImportRun.Status.SUCCESS
        )

        inserted_count = 0
        skipped_count = 0

        with transaction.atomic():
            for date_str, temp_val in t2m_dict.items():
                if temp_val is None or temp_val == -999.0:
                    temp_celsius = None
                else:
                    temp_celsius = float(temp_val)

                dt = datetime.strptime(date_str, "%Y%m%d").replace(hour=12, minute=0, second=0, tzinfo=dt_timezone.utc)

                record_hash = generate_telemetry_hash(
                    farmer_id=farmer.id,
                    recorded_at=dt,
                    temperature=temp_celsius,
                    soil_moisture=None,
                    soil_ph=None
                )

                if EnvironmentalTelemetry.objects.filter(payload_sha256=record_hash).exists():
                    skipped_count += 1
                    continue

                EnvironmentalTelemetry.objects.create(
                    farmer=farmer,
                    recorded_at=dt,
                    temperature_celsius=temp_celsius,
                    soil_moisture_percentage=None,
                    soil_ph=None,
                    payload_sha256=record_hash,
                    provenance=provenance
                )
                inserted_count += 1

        import_run.completed_at = timezone.now()
        import_run.records_inserted = inserted_count
        import_run.records_skipped = skipped_count
        import_run.save()

        self.stdout.write(self.style.SUCCESS(
            f"NASA POWER Import Complete: {inserted_count} inserted, {skipped_count} skipped (idempotent duplicate prevention). Raw SHA-256: {raw_sha256[:16]}..."
        ))
