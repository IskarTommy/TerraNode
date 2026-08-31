from django.urls import path
from .views import (
    BatchPrepareView,
    BatchConfirmView,
    BatchTransferView,
    BatchListView,
    BatchDetailView,
    PublicBatchVerifyView
)

urlpatterns = [
    path('prepare/', BatchPrepareView.as_view(), name='batch_prepare'),
    path('list/', BatchListView.as_view(), name='batch_list'),
    path('<uuid:pk>/', BatchDetailView.as_view(), name='batch_detail'),
    path('<uuid:pk>/confirm/', BatchConfirmView.as_view(), name='batch_confirm'),
    path('<uuid:pk>/transfer/', BatchTransferView.as_view(), name='batch_transfer'),
    path('verify/<str:identifier>/', PublicBatchVerifyView.as_view(), name='public_batch_verify'),
]
