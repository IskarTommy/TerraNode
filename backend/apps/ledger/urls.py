from django.urls import path
from .views import BatchPrepareView, BatchConfirmView, BatchTransferView, BatchListView

urlpatterns = [
    path('prepare/', BatchPrepareView.as_view(), name='batch_prepare'),
    path('<uuid:pk>/confirm/', BatchConfirmView.as_view(), name='batch_confirm'),
    path('<uuid:pk>/transfer/', BatchTransferView.as_view(), name='batch_transfer'),
    path('list/', BatchListView.as_view(), name='batch_list'),
]
