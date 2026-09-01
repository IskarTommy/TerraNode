from rest_framework import serializers
from .models import ProduceBatch, CustodyTransfer

class BatchPrepareSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProduceBatch
        fields = ('id', 'origin_telemetry', 'crop_type', 'weight_kg', 'status', 'data_integrity_hash', 'created_at')
        read_only_fields = ('id', 'status', 'data_integrity_hash', 'created_at')

    def validate_weight_kg(self, value):
        if value.as_tuple().exponent < -3:
            raise serializers.ValidationError("Weight must use at most three decimal places (one gram precision).")
        if value <= 0:
            raise serializers.ValidationError("Weight must be greater than zero.")
        return value

class BatchConfirmSerializer(serializers.Serializer):
    sui_tx_digest = serializers.CharField(max_length=100, required=True, allow_blank=False, trim_whitespace=True)

    def validate_sui_tx_digest(self, value):
        if "SIMULATED" in value.upper():
            raise serializers.ValidationError("Simulated transaction digests are not accepted.")
        return value


class BatchTransferInputSerializer(serializers.Serializer):
    to_user_id = serializers.UUIDField(required=True)
    sui_tx_digest = serializers.CharField(max_length=100, required=True, allow_blank=False, trim_whitespace=True)
    status = serializers.ChoiceField(
        choices=(ProduceBatch.Status.IN_TRANSIT, ProduceBatch.Status.DELIVERED),
        default=ProduceBatch.Status.IN_TRANSIT,
    )
    metadata = serializers.JSONField(required=False, default=dict)

    def validate_sui_tx_digest(self, value):
        if "SIMULATED" in value.upper():
            raise serializers.ValidationError("Simulated transaction digests are not accepted.")
        return value

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
