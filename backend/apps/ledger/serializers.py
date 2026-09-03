from rest_framework import serializers
from .models import ProduceBatch, CustodyTransfer

class BatchPrepareSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProduceBatch
        fields = ('id', 'origin_telemetry', 'crop_type', 'weight_kg', 'status', 'data_integrity_hash', 'created_at')
        read_only_fields = ('id', 'status', 'data_integrity_hash', 'created_at')

    def validate_origin_telemetry(self, telemetry):
        request = self.context.get('request')
        if request and telemetry and telemetry.farmer != request.user:
            raise serializers.ValidationError("Telemetry must belong to the farmer creating the batch.")
        return telemetry

class BatchConfirmSerializer(serializers.Serializer):
    sui_object_id = serializers.CharField(max_length=66, required=True)
    sui_tx_digest = serializers.CharField(max_length=66, required=False, allow_blank=True)

class CustodyTransferSerializer(serializers.ModelSerializer):
    from_user = serializers.UUIDField(read_only=True, source='from_user_id')
    to_user = serializers.UUIDField(read_only=True, source='to_user_id')
    from_user_name = serializers.CharField(read_only=True, source='from_user.full_name')
    from_user_email = serializers.CharField(read_only=True, source='from_user.email')
    from_user_role = serializers.CharField(read_only=True, source='from_user.role')
    to_user_name = serializers.CharField(read_only=True, source='to_user.full_name')
    to_user_email = serializers.CharField(read_only=True, source='to_user.email')
    to_user_role = serializers.CharField(read_only=True, source='to_user.role')

    class Meta:
        model = CustodyTransfer
        fields = '__all__'

class BatchOutputSerializer(serializers.ModelSerializer):
    farmer = serializers.UUIDField(read_only=True, source='farmer_id')
    farmer_name = serializers.CharField(read_only=True, source='farmer.full_name')
    farmer_email = serializers.CharField(read_only=True, source='farmer.email')
    farmer_wallet = serializers.CharField(read_only=True, source='farmer.sui_public_key')
    current_custodian = serializers.UUIDField(read_only=True, source='current_custodian_id')
    current_custodian_name = serializers.CharField(read_only=True, source='current_custodian.full_name')
    current_custodian_email = serializers.CharField(read_only=True, source='current_custodian.email')
    current_custodian_wallet = serializers.CharField(read_only=True, source='current_custodian.sui_public_key')
    origin_telemetry = serializers.UUIDField(read_only=True, source='origin_telemetry_id')
    weight_grams = serializers.IntegerField(read_only=True)
    transfers = CustodyTransferSerializer(many=True, read_only=True)

    class Meta:
        model = ProduceBatch
        fields = '__all__'
