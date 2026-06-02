from rest_framework import serializers
from .models import Question, Scenario, ScoringRules


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = [
            "id", "order", "title", "prompt", "question_type",
            "is_bonus", "base_points", "correct_answer", "choices",
            "hint", "explanation", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ScoringRulesSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScoringRules
        fields = [
            "id", "attempt_penalty_after_n",
            "attempt_penalty_per_mistake", "max_attempt_penalty",
            "time_penalty_threshold_minutes", "time_penalty_per_minute",
            "max_time_penalty", "hint_penalty",
        ]
        read_only_fields = ["id"]


class ScenarioListSerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = Scenario
        fields = ["id", "name", "description", "allow_hints", "randomize_questions",
                  "sequential", "created_at", "question_count"]

    def get_question_count(self, obj):
        return obj.questions.count()


class ScenarioDetailSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    scoring_rules = ScoringRulesSerializer(read_only=True)
    question_count = serializers.SerializerMethodField()
    base_points_total = serializers.SerializerMethodField()

    class Meta:
        model = Scenario
        fields = [
            "id", "name", "description", "allow_hints", "randomize_questions",
            "sequential", "created_at", "updated_at",
            "question_count", "base_points_total", "questions", "scoring_rules",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_question_count(self, obj):
        return obj.questions.count()

    def get_base_points_total(self, obj):
        return float(sum(q.base_points for q in obj.questions.filter(is_bonus=False)))
