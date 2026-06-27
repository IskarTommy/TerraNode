from django.urls import path
from .views import PredictYieldView, SummaryView

urlpatterns = [
    path('predict/', PredictYieldView.as_view(), name='analytics_predict'),
    path('summary/', SummaryView.as_view(), name='analytics_summary'),
]
