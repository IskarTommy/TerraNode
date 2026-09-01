import hashlib
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone as datetime_timezone
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.telemetry.encryption_service import encrypted_storage_fields
from apps.telemetry.models import DataProvenance, EnvironmentalTelemetry, ImportRun
from apps.users.models import CustomUser


GHANA_PRESETS = {
    "accra": ("Accra (Greater Accra reference)", Decimal("5.5593"), Decimal("-0.1974")),
    "kumasi": ("Kumasi (Ashanti reference)", Decimal("6.6885"), Decimal("-1.6244")),
    "tamale": ("Tamale (Northern reference)", Decimal("9.4008"), Decimal("-0.8393")),
    "sunyani": ("Sunyani (Bono reference)", Decimal("7.3349"), Decimal("-2.3123")),
}
MISSING_VALUE = -999.0


def _parse_date(value, label):
    try:
        return datetime.strptime(value, "%Y%m%d").date()
    except (TypeError, ValueError) as exc:
        raise CommandError(f"{label} must use YYYYMMDD format") from exc


def _fetch_with_retries(request, attempts=3):
    last_error = None
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.read()
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            last_error = exc
            if attempt + 1 < attempts:
                time.sleep(2**attempt)
    raise CommandError(f"NASA POWER request failed after {attempts} attempts: {last_error}")


def _measurement(value, *, scale=1.0, minimum=None, maximum=None):
    if value is None:
        return None
    numeric = float(value)
    if numeric <= MISSING_VALUE:
        return None
    numeric *= scale
    if minimum is not None and numeric < minimum:
        return None
    if maximum is not None and numeric > maximum:
        return None
    return numeric


class Command(BaseCommand):
    help = "Import genuine daily temperature and NASA POWER root-zone soil wetness observations."

    def add_arguments(self, parser):
        parser.add_argument("--farmer-email", required=True)
        parser.add_argument("--preset", choices=sorted(GHANA_PRESETS))
        parser.add_argument("--latitude", type=Decimal)
        parser.add_argument("--longitude", type=Decimal)
        parser.add_argument("--start", required=True)
        parser.add_argument("--end", required=True)

    def handle(self, *args, **options):
        try:
            farmer = CustomUser.objects.get(
                email=options["farmer_email"],
                role=CustomUser.Role.FARMER,
                is_active=True,
            )
        except CustomUser.DoesNotExist as exc:
            raise CommandError("An active farmer account with that email is required") from exc

        preset = options.get("preset")
        latitude = options.get("latitude")
        longitude = options.get("longitude")
        if preset and (latitude is not None or longitude is not None):
            raise CommandError("Use either --preset or custom coordinates, not both")
        if preset:
            location_name, latitude, longitude = GHANA_PRESETS[preset]
        elif latitude is not None and longitude is not None:
            location_name = "Custom coordinates"
        else:
            raise CommandError("Provide --preset or both --latitude and --longitude")
        if not Decimal("-90") <= latitude <= Decimal("90"):
            raise CommandError("Latitude must be between -90 and 90")
        if not Decimal("-180") <= longitude <= Decimal("180"):
            raise CommandError("Longitude must be between -180 and 180")

        start = _parse_date(options["start"], "start")
        end = _parse_date(options["end"], "end")
        if start > end:
            raise CommandError("start must not be after end")
        if (end - start).days > 366:
            raise CommandError("A single import may cover at most 367 days")

        base_url = "https://power.larc.nasa.gov/api/temporal/daily/point"
        params = {
            "parameters": "T2M,GWETROOT",
            "community": "AG",
            "longitude": str(longitude),
            "latitude": str(latitude),
            "start": start.strftime("%Y%m%d"),
            "end": end.strftime("%Y%m%d"),
            "format": "JSON",
        }
        request_url = f"{base_url}?{urllib.parse.urlencode(params)}"
        source_record_id = (
            f"NASAPOWER:{latitude}:{longitude}:"
            f"{params['start']}:{params['end']}:T2M,GWETROOT"
        )
        provenance, _ = DataProvenance.objects.get_or_create(
            source_type=DataProvenance.SourceType.DATASET_IMPORT,
            provider_name="NASA POWER",
            source_record_id=source_record_id,
            defaults={
                "dataset_name": "POWER Daily Point AG",
                "source_url": request_url,
                "license_attribution": "NASA POWER project data access terms",
                "latitude": latitude,
                "longitude": longitude,
                "time_standard": "UTC",
                "parameters_units": {
                    "T2M": "degrees Celsius",
                    "GWETROOT": "dimensionless root-zone wetness index; stored as percent after x100",
                },
            },
        )
        import_run = ImportRun.objects.create(
            provenance=provenance,
            status=ImportRun.Status.IN_PROGRESS,
        )

        try:
            request = urllib.request.Request(
                request_url,
                headers={"User-Agent": "TerraNode-NASA-Importer/2.0"},
            )
            raw = _fetch_with_retries(request)
            raw_hash = hashlib.sha256(raw).hexdigest()
            try:
                payload = json.loads(raw.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                raise CommandError("NASA POWER returned invalid JSON") from exc
            parameters = payload.get("properties", {}).get("parameter", {})
            temperature_by_date = parameters.get("T2M")
            moisture_by_date = parameters.get("GWETROOT")
            if not isinstance(temperature_by_date, dict) or not isinstance(moisture_by_date, dict):
                raise CommandError("NASA POWER response is missing T2M or GWETROOT parameter data")

            provenance.dataset_name = "POWER Daily Point AG"
            provenance.source_url = request_url
            provenance.license_attribution = "NASA POWER project data access terms"
            provenance.raw_payload_sha256 = raw_hash
            provenance.latitude = latitude
            provenance.longitude = longitude
            provenance.time_standard = "UTC"
            provenance.parameters_units = {
                "T2M": "degrees Celsius",
                "GWETROOT": "dimensionless root-zone wetness index; stored as percent after x100",
                "location_label": location_name,
            }
            provenance.save()

            inserted = skipped = missing = 0
            dates = sorted(set(temperature_by_date) | set(moisture_by_date))
            with transaction.atomic():
                for date_string in dates:
                    try:
                        recorded_at = datetime.strptime(date_string, "%Y%m%d").replace(
                            hour=12,
                            tzinfo=datetime_timezone.utc,
                        )
                    except ValueError:
                        missing += 1
                        continue
                    temperature = _measurement(
                        temperature_by_date.get(date_string),
                        minimum=-50,
                        maximum=70,
                    )
                    soil_moisture = _measurement(
                        moisture_by_date.get(date_string),
                        scale=100,
                        minimum=0,
                        maximum=100,
                    )
                    if temperature is None and soil_moisture is None:
                        missing += 1
                        continue
                    storage = encrypted_storage_fields(
                        farmer.id,
                        recorded_at,
                        temperature,
                        soil_moisture,
                        None,
                    )
                    if EnvironmentalTelemetry.objects.filter(
                        payload_sha256=storage["payload_sha256"]
                    ).exists():
                        skipped += 1
                        continue
                    EnvironmentalTelemetry.objects.create(
                        farmer=farmer,
                        recorded_at=recorded_at,
                        temperature_celsius=None,
                        soil_moisture_percentage=None,
                        soil_ph=None,
                        provenance=provenance,
                        **storage,
                    )
                    inserted += 1

                import_run.status = (
                    ImportRun.Status.PARTIAL if missing else ImportRun.Status.SUCCESS
                )
                import_run.records_inserted = inserted
                import_run.records_skipped = skipped + missing
                import_run.records_failed = missing
                import_run.validation_errors = (
                    [{"missing_observation_days": missing}] if missing else []
                )
                import_run.completed_at = timezone.now()
                import_run.save()
        except Exception as exc:
            import_run.status = ImportRun.Status.FAILED
            import_run.completed_at = timezone.now()
            import_run.records_failed = 1
            import_run.validation_errors = [
                {"type": type(exc).__name__, "message": str(exc)}
            ]
            import_run.save()
            if isinstance(exc, CommandError):
                raise
            raise CommandError(f"NASA POWER import failed: {exc}") from exc

        self.stdout.write(
            self.style.SUCCESS(
                f"NASA POWER import complete: inserted={inserted}, "
                f"duplicates={skipped}, missing_days={missing}, raw_sha256={raw_hash}"
            )
        )
