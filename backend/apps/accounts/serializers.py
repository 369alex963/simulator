import re

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.branches.models import Branch
from .models import LoginAuditLog, Role, User


PASSWORD_RE = re.compile(r"^(?=.*[A-Z]).{6,}$")


def validate_kernelios_password(value: str) -> str:
    """6+ chars, at least 1 uppercase letter."""
    if not PASSWORD_RE.match(value):
        raise serializers.ValidationError(
            "Password must be at least 6 characters and contain at least one uppercase letter."
        )
    return value


class BranchMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ["id", "name", "is_hq"]


class UserMiniSerializer(serializers.ModelSerializer):
    branch = BranchMiniSerializer(read_only=True)
    display_role = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "role", "display_role", "branch", "must_change_password",
            "is_active", "date_joined", "has_seen_onboarding",
        ]


class UserDetailSerializer(serializers.ModelSerializer):
    branch = BranchMiniSerializer(read_only=True)
    branch_id = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(),
        source="branch",
        write_only=True,
        required=False,
        allow_null=True,
    )
    display_role = serializers.CharField(read_only=True)
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "role", "display_role", "branch", "branch_id",
            "must_change_password", "created_via", "moodle_user_id",
            "is_active", "is_super_admin", "date_joined", "password",
        ]
        read_only_fields = ["id", "is_super_admin", "is_staff", "date_joined", "last_login", "created_via"]

    def validate_password(self, value):
        return validate_kernelios_password(value)

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        if password:
            instance.set_password(password)
            instance.must_change_password = False
        instance.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField()
    new_password = serializers.CharField()

    def validate_new_password(self, value):
        return validate_kernelios_password(value)


class LoginAuditSerializer(serializers.ModelSerializer):
    username_attempted = serializers.CharField()

    class Meta:
        model = LoginAuditLog
        fields = [
            "id", "username_attempted", "ip_address", "country_code",
            "success", "created_at",
        ]


class StudentSelfRegisterSerializer(serializers.Serializer):
    """For the public /register endpoint — students only."""
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField()
    instance_id = serializers.IntegerField()

    def validate_password(self, value):
        return validate_kernelios_password(value)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already taken.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value
