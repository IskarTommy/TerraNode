from rest_framework import serializers

from .encryption_service import read_telemetry_values
from .models import EnvironmentalTelemetry


class TelemetryInputSerializer(serializers.Serializer):
    recorded_at = serializers.DateTimeField(required=False)
    temperature_celsius = serializers.FloatField(
        min_value=-50.0,
        max_value=100.0,
        required=False,
        allow_null=True,
    )
    soil_moisture_percentage = serializers.FloatField(
        min_value=0.0,
        max_value=100.0,
        required=False,
        allow_null=True,
    )
    soil_ph = serializers.FloatField(
        min_value=0.0,
        max_value=14.0,
        required=False,
        allow_null=True,
    )

    def validate(self, attrs):
        measurements = (
            attrs.get("temperature_celsius"),
            attrs.get("soil_moisture_percentage"),
            attrs.get("soil_ph"),
        )
        if all(value is None for value in measurements):
            raise serializers.ValidationError("At least one genuine measurement is required.")
        return attrs


class TelemetryOutputSerializer(serializers.ModelSerializer):
    temperature_celsius = serializers.SerializerMethodField()
    soil_moisture_percentage = serializers.SerializerMethodField()
    soil_ph = serializers.SerializerMethodField()
    source_type = serializers.CharField(source="provenance.source_type", read_only=True)

    class Meta:
        model = EnvironmentalTelemetry
        fields = (
            "id",
            "farmer",
            "recorded_at",
            "temperature_celsius",
            "soil_moisture_percentage",
            "soil_ph",
            "payload_sha256",
            "schema_version",
            "key_version",
            "source_type",
            "created_at",
        )
        read_only_fields = fields

    def _values(self, record):
        cache_name = "_authorized_decrypted_values"
        if not hasattr(record, cache_name):
            request = self.context.get("request")
            setattr(
                record,
                cache_name,
                read_telemetry_values(record, request_user=getattr(request, "user", None)),
            )
        return getattr(record, cache_name)

    def get_temperature_celsius(self, record):
        return self._values(record)["temperature_celsius"]

    def get_soil_moisture_percentage(self, record):
        return self._values(record)["soil_moisture_percentage"]

    def get_soil_ph(self, record):
        return self._values(record)["soil_ph"]
