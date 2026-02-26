from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import HealthView, LoginView, LogoutView, MeView, MilestoneViewSet, ProjectViewSet, RiskViewSet, TaskViewSet

router = DefaultRouter()
router.register('projects', ProjectViewSet, basename='project')
router.register('tasks', TaskViewSet, basename='task')
router.register('milestones', MilestoneViewSet, basename='milestone')
router.register('risks', RiskViewSet, basename='risk')

urlpatterns = [
    path('health/', HealthView.as_view(), name='health'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('', include(router.urls)),
]
