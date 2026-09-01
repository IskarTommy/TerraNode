from django.urls import path
from .views import (
    BatchPrepareView,
    BatchConfirmView,
    BatchTransferView,
    BatchListView,
    BatchDetailView,
    PublicBatchVerifyView,
    CustodyTransferHistoryView,
    BatchLookupView,
)

urlpatterns = [
    path('prepare/', BatchPrepareView.as_view(), name='batch_prepare'),
    path('list/', BatchListView.as_view(), name='batch_list'),
    path('lookup/<str:identifier>/', BatchLookupView.as_view(), name='batch_lookup'),
    path('<uuid:pk>/', BatchDetailView.as_view(), name='batch_detail'),
    path('<uuid:pk>/confirm/', BatchConfirmView.as_view(), name='batch_confirm'),
    path('<uuid:pk>/transfer/', BatchTransferView.as_view(), name='batch_transfer'),
    path('<uuid:pk>/transfers/', CustodyTransferHistoryView.as_view(), name='batch_transfer_history'),
    path('verify/<str:identifier>/', PublicBatchVerifyView.as_view(), name='public_batch_verify'),
]
