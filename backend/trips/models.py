from django.db import models
from django_extensions.db.models import TimeStampedModel

#-----------------------------------------------------------#
# Choices
#-----------------------------------------------------------#

TRIP_STATUS_CHOICES = (
    ("PENDING", "PENDING"),
    ("PLANNED", "PLANNED"),
    ("FAILED", "FAILED"),
)

LOCATION_ROLE_CHOICES = (
    ("origin", "origin"),
    ("pickup", "pickup"),
    ("dropoff", "dropoff"),
)

SEGMENT_STATUS_CHOICES = (
    ("off_duty", "off_duty"),
    ("sleeper", "sleeper"),
    ("driving", "driving"),
    ("on_duty_not_driving", "on_duty_not_driving"),
)

STOP_KIND_CHOICES = (
    ("pickup", "pickup"),
    ("dropoff", "dropoff"),
    ("fuel", "fuel"),
    ("break", "break"),
    ("rest", "rest"),
    ("stop", "stop"),
)


#-----------------------------------------------------------#
# Trip
#-----------------------------------------------------------#

# Trip record: input and lifecycle

class Trip(TimeStampedModel):

    current_location = models.CharField(max_length=500)
    pickup_location = models.CharField(max_length=500)
    dropoff_location = models.CharField(max_length=500)
    current_cycle_used = models.FloatField(default=0.0)
    start_time = models.DateTimeField()

    status = models.CharField(max_length=50, choices=TRIP_STATUS_CHOICES, default="PENDING")
    error_message = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ["-created"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["-created"]),
        ]

    def __str__(self):
        return (
            f"Trip #{self.id}: {self.current_location} "
            f"-> {self.pickup_location} -> {self.dropoff_location}"
        )


#-----------------------------------------------------------#
# Locations
#-----------------------------------------------------------#

# One row per geocoded endpoint of the trip.

class TripLocation(TimeStampedModel):

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="locations")
    role = models.CharField(max_length=20, choices=LOCATION_ROLE_CHOICES)
    query = models.CharField(max_length=500)          # what the user typed
    label = models.CharField(max_length=500)          # what the geocoder returned
    lat = models.FloatField()
    lng = models.FloatField()

    class Meta:
        ordering = ["id"]
        unique_together = (("trip", "role"),)

    def __str__(self):
        return f"{self.role}: {self.label}"


#-----------------------------------------------------------#
# Route and geometry
#-----------------------------------------------------------#

# Aggregate route metrics and per-leg summary. One per trip.

class TripRoute(TimeStampedModel):

    trip = models.OneToOneField(Trip, on_delete=models.CASCADE, related_name="route")
    total_miles = models.FloatField(default=0.0)
    total_duration_hours = models.FloatField(default=0.0)
    legs_summary = models.JSONField(default=list)

    def __str__(self):
        return f"Route for trip #{self.trip_id} ({self.total_miles} mi)"


class TripRouteGeometry(TimeStampedModel):

    route = models.OneToOneField(TripRoute, on_delete=models.CASCADE, related_name="geometry")
    points = models.JSONField(default=list)  # latitude and longitude points for the route 

    def __str__(self):
        return f"Geometry for trip #{self.route.trip_id} ({len(self.points)} pts)"


#-----------------------------------------------------------#
# HOS segments
#-----------------------------------------------------------#

# One HOS status block produced by the simulator.

class TripSegment(TimeStampedModel):

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="segments")
    sequence = models.IntegerField(default=0)
    status = models.CharField(max_length=30, choices=SEGMENT_STATUS_CHOICES)
    start = models.DateTimeField()
    end = models.DateTimeField()
    hours = models.FloatField()
    start_miles = models.FloatField(default=0.0)
    end_miles = models.FloatField(default=0.0)
    note = models.CharField(max_length=500, blank=True, default="")

    class Meta:
        ordering = ["sequence"]
        indexes = [models.Index(fields=["trip", "sequence"])]

    def __str__(self):
        return f"#{self.sequence} {self.status} ({self.hours:.2f}h)"


#-----------------------------------------------------------#
# Daily log sheets
#-----------------------------------------------------------#

# Header row of one FMCSA-style daily log sheet.

class TripDailyLog(TimeStampedModel):

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="daily_logs")
    date = models.DateField()
    off_duty_hours = models.FloatField(default=0.0)
    sleeper_hours = models.FloatField(default=0.0)
    driving_hours = models.FloatField(default=0.0)
    on_duty_hours = models.FloatField(default=0.0)
    total_hours = models.FloatField(default=0.0)

    cycle_hours_after_day = models.FloatField(default=0.0)
    cycle_remaining = models.FloatField(default=0.0)

    class Meta:
        ordering = ["date"]
        unique_together = (("trip", "date"),)

    def __str__(self):
        return f"{self.date} (driving={self.driving_hours:.2f}h)"

# One status block on a daily log sheet.

class TripDailyLogEntry(TimeStampedModel):

    log = models.ForeignKey(
        TripDailyLog, on_delete=models.CASCADE, related_name="entries",
    )
    sequence = models.IntegerField(default=0)
    status = models.CharField(max_length=30, choices=SEGMENT_STATUS_CHOICES)
    start_hour = models.FloatField()
    end_hour = models.FloatField()
    note = models.CharField(max_length=500, blank=True, default="")
    start_miles = models.FloatField(default=0.0)
    end_miles = models.FloatField(default=0.0)

    class Meta:
        ordering = ["sequence"]

    def __str__(self):
        return f"{self.status} [{self.start_hour}–{self.end_hour}]"


#-----------------------------------------------------------#
# Stops (map pins)
#-----------------------------------------------------------#

# A stop rendered on the map: pickup, dropoff, fuel, break, or reset.

class TripStop(TimeStampedModel):

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="stops")
    sequence = models.IntegerField(default=0)
    kind = models.CharField(max_length=20, choices=STOP_KIND_CHOICES)
    lat = models.FloatField()
    lng = models.FloatField()
    miles = models.FloatField(default=0.0)
    label = models.CharField(max_length=500, blank=True, default="")
    status = models.CharField(max_length=30)
    scheduled_start = models.DateTimeField()
    scheduled_end = models.DateTimeField()
    hours = models.FloatField()

    class Meta:
        ordering = ["sequence"]
        indexes = [models.Index(fields=["trip", "sequence"])]

    def __str__(self):
        return f"#{self.sequence} {self.kind} @ {self.miles} mi"