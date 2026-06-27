from rest_framework import serializers
from .models import EnvironmentalTelemetry
from .services import generate_telemetry_hash

class TelemetryInputSerializer(serializers.Serializer):
    temperature_celsius = serializers.FloatField(min_value=-50.0, max_value=100.0)
    soil_moisture_percentage = serializers.FloatField(min_value=0.0, max_value=100.0)
    soil_ph = serializers.FloatField(min_value=0.0, max_value=14.0)

class TelemetryOutputSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnvironmentalTelemetry
        fields = (
            'id', 'farmer', 'recorded_at', 'temperature_celsius',
            'soil_moisture_percentage', 'soil_ph', 'payload_sha256', 'created_at'
        )
