from rest_framework import serializers
from apps.accounts.serializers import UserMiniSerializer
from apps.branches.serializers import BranchSerializer
from apps.scenarios.serializers import ScenarioListSerializer
from .models import Instance


class InstanceListSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    scenario_name = serializers.CharField(source="scenario.name", read_only=True, default="")
    enrollment_count = serializers.SerializerMethodField()

    class Meta:
        model = Instance
        fields = [
            "id", "name", "status", "branch_name", "scenario_name",
            "registration_open", "registration_closes_at",
            "enrollment_count", "created_at",
        ]

    def get_enrollment_count(self, obj):
        return obj.enrollments.count()


class InstanceDetailSerializer(serializers.ModelSerializer):
    branch = BranchSerializer(read_only=True)
    branch_id = serializers.PrimaryKeyRelatedField(
        source="branch",
        queryset=__import__("apps.branches.models", fromlist=["Branch"]).Branch.objects.all(),
        write_only=True, required=False,
    )
    scenario = ScenarioListSerializer(read_only=True)
    scenario_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    assigned_teachers = UserMiniSerializer(many=True, read_only=True)
    enrollment_count = serializers.SerializerMethodField()

    class Meta:
        model = Instance
        fields = [
            "id", "name", "status", "branch", "branch_id",
            "scenario", "scenario_id",
            "assigned_teachers", "registration_open", "registration_closes_at",
            "moodle_course_id", "moodle_auto_push",
            "exported_at", "enrollment_count",
            "created_at", "updated_at", "archived_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "archived_at", "exported_at"]

    def get_enrollment_count(self, obj):
        return obj.enrollments.count()


class OpenInstanceSerializer(serializers.ModelSerializer):
    """Minimal info for the register page dropdown."""
    branch_name = serializers.CharField(source="branch.name", read_only=True)

    class Meta:
        model = Instance
        fields = ["id", "name", "branch_name"]
