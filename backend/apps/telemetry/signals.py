from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import EnvironmentalTelemetry


@receiver([post_save, post_delete], sender=EnvironmentalTelemetry)
def invalidate_yield_prediction_cache(sender, instance, **kwargs):
    from apps.analytics.services import invalidate_prediction_cache

    invalidate_prediction_cache(instance.farmer_id)
