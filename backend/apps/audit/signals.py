"""
Django post_save / post_delete signals that auto-generate AuditLog rows
for the key models in KERNELiOS.

Field-level diffs are computed by comparing the pre-save snapshot stored
in pre_save against the post-save instance.
"""
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from .models import AuditLog
from .recorder import log_action

# Models we want to audit — import lazily inside signal handlers to avoid
# circular imports at module load time.
TRACKED_MODELS = [
    "accounts.User",
    "branches.Branch",
    "branding.BrandKit",
    "scenarios.Scenario",
    "scenarios.Question",
    "scenarios.ScoringRules",
    "instances.Instance",
    "enrollments.Enrollment",
    "enrollments.QuestionAttempt",
    "notifications.Announcement",
    "notifications.HelpRequest",
    "core.AppConfig",
]

# Thread-local snapshot store  {(model_label, pk): {field: old_value}}
import threading
_snap = threading.local()


def _label(instance) -> str:
    return f"{instance._meta.app_label}.{instance.__class__.__name__}"


def _is_tracked(instance) -> bool:
    return _label(instance) in TRACKED_MODELS


def _snap_key(instance) -> tuple:
    return (_label(instance), instance.pk)


def _serializable(val):
    """Convert value to a JSON-safe type."""
    if val is None or isinstance(val, (bool, int, float, str)):
        return val
    return str(val)


@receiver(pre_save)
def _capture_pre_save(sender, instance, **kwargs):
    """Before save: snapshot current DB values for diff."""
    if not _is_tracked(instance) or not instance.pk:
        return
    try:
        old = sender.objects.get(pk=instance.pk)
        snap = {}
        for field in instance._meta.concrete_fields:
            name = field.attname
            snap[name] = _serializable(getattr(old, name, None))
        if not hasattr(_snap, "store"):
            _snap.store = {}
        _snap.store[_snap_key(instance)] = snap
    except sender.DoesNotExist:
        pass
    except Exception:
        pass


@receiver(post_save)
def _on_post_save(sender, instance, created, **kwargs):
    if not _is_tracked(instance):
        return

    if created:
        log_action(action=AuditLog.ACTION_CREATE, instance=instance, changes={})
        return

    # Compute diff
    key = _snap_key(instance)
    old_snap = getattr(_snap, "store", {}).pop(key, {})
    changes = {}
    for field in instance._meta.concrete_fields:
        name = field.attname
        new_val = _serializable(getattr(instance, name, None))
        old_val = old_snap.get(name)
        if old_val != new_val:
            # Skip uninteresting fields
            if name in ("updated_at", "last_login", "password"):
                if name == "password":
                    changes["password"] = {"old": "***", "new": "***"}
                continue
            changes[name] = {"old": old_val, "new": new_val}

    if changes:
        log_action(action=AuditLog.ACTION_UPDATE, instance=instance, changes=changes)


@receiver(post_delete)
def _on_post_delete(sender, instance, **kwargs):
    if not _is_tracked(instance):
        return
    log_action(action=AuditLog.ACTION_DELETE, instance=instance, changes={})
