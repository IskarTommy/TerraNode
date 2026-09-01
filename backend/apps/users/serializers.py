from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['role'] = user.role
        token['email'] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data.update({
            'user': {
                'id': str(self.user.id),
                'email': self.user.email,
                'full_name': self.user.full_name,
                'role': self.user.role,
                'sui_public_key': self.user.sui_public_key,
            }
        })
        return data

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'},
    )

    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'full_name', 'role', 'sui_public_key')
        read_only_fields = ('id', 'sui_public_key')

    def validate_role(self, value):
        if value not in {User.Role.FARMER, User.Role.LOGISTICS}:
            raise serializers.ValidationError("Public registration is limited to farmers and logistics stakeholders.")
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'role', 'sui_public_key')
        read_only_fields = ('id', 'email', 'role', 'sui_public_key')


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "full_name",
            "role",
            "sui_public_key",
            "is_active",
            "date_joined",
            "last_login",
        )
        read_only_fields = fields


class StakeholderSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "full_name", "role", "sui_public_key")
        read_only_fields = fields
