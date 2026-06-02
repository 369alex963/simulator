from django.contrib import admin
from .models import Scenario, Question, ScoringRules


class QuestionInline(admin.TabularInline):
    model = Question
    fields = ["order", "title", "question_type", "is_bonus", "base_points"]
    extra = 0


@admin.register(Scenario)
class ScenarioAdmin(admin.ModelAdmin):
    list_display = ["name", "question_count", "allow_hints", "randomize_questions", "created_at"]
    list_filter = ["allow_hints"]
    inlines = [QuestionInline]

    def question_count(self, obj):
        return obj.questions.count()
    question_count.short_description = "Questions"


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ["scenario", "order", "title", "question_type", "is_bonus", "base_points"]
    list_filter = ["scenario", "question_type", "is_bonus"]


@admin.register(ScoringRules)
class ScoringRulesAdmin(admin.ModelAdmin):
    list_display = ["scenario", "attempt_penalty_per_mistake", "max_attempt_penalty",
                    "time_penalty_threshold_minutes", "time_penalty_per_minute", "max_time_penalty"]
