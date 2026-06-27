from rest_framework import serializers
from .models import ProduceBatch

class BatchPrepareSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProduceBatch
        fields = ('origin_telemetry', 'crop_type', 'weight_kg')

class BatchConfirmSerializer(serializers.Serializer):
    sui_object_id = serializers.CharField(max_length=66, required=True)

class BatchOutputSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProduceBatch
        fields = '__all__'
