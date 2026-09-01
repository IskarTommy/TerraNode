from rest_framework import serializers
from .models import ProduceBatch, CustodyTransfer

class BatchPrepareSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProduceBatch
        fields = ('id', 'origin_telemetry', 'crop_type', 'weight_kg', 'status', 'data_integrity_hash', 'created_at')
        read_only_fields = ('id', 'status', 'data_integrity_hash', 'created_at')

class BatchConfirmSerializer(serializers.Serializer):
    sui_object_id = serializers.CharField(max_length=66, required=True)
    sui_tx_digest = serializers.CharField(max_length=66, required=False, allow_blank=True)

class CustodyTransferSerializer(serializers.ModelSerializer):
    from_user = serializers.UUIDField(read_only=True, source='from_user_id')
    to_user = serializers.UUIDField(read_only=True, source='to_user_id')

    class Meta:
        model = CustodyTransfer
        fields = '__all__'

class BatchOutputSerializer(serializers.ModelSerializer):
    farmer = serializers.UUIDField(read_only=True, source='farmer_id')
    current_custodian = serializers.UUIDField(read_only=True, source='current_custodian_id')
    origin_telemetry = serializers.UUIDField(read_only=True, source='origin_telemetry_id')
    weight_grams = serializers.IntegerField(read_only=True)
    transfers = CustodyTransferSerializer(many=True, read_only=True)

    class Meta:
        model = ProduceBatch
        fields = '__all__'
