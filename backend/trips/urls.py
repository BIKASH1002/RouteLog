from django.urls import path

from trips import api

urlpatterns = [
    path("health/", api.healthcheck, name="healthcheck"),
    path("plan/", api.plan_trip, name="plan_trip"),
    path("get/", api.get_trip, name="get_trip"),
    path("list/", api.list_trips, name="list_trips"),
    path("geocode/", api.geocode, name="geocode"),
    path("daily-log/", api.daily_log, name="daily_log"),
]