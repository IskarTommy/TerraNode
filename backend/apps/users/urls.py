from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    RegisterView,
    ProfileView,
    LogoutView,
    RequestWalletChallengeView,
    WalletLoginView,
    AdminUserListView,
    StakeholderListView,
)

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('wallet-challenge/', RequestWalletChallengeView.as_view(), name='wallet_challenge'),
    path('wallet-login/', WalletLoginView.as_view(), name='wallet_login'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('profile/', ProfileView.as_view(), name='auth_profile'),
    path('users/', AdminUserListView.as_view(), name='admin_user_list'),
    path('stakeholders/', StakeholderListView.as_view(), name='stakeholder_list'),
]
