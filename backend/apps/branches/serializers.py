from rest_framework import serializers
from .models import Branch


class BranchSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Branch
        fields = ["id", "name", "is_hq", "is_active", "created_at", "user_count"]
        read_only_fields = ["id", "is_hq", "created_at"]

    def get_user_count(self, obj):
        return obj.users.filter(is_active=True).count()


class BranchCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ["id", "name", "is_active"]

    def validate_name(self, value):
        if Branch.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("A branch with this name already exists.")
        return value
