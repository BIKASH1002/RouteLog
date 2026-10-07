from django.contrib import admin

from trips.models import Trip, TripDailyLog, TripLocation, TripRoute, TripRouteGeometry, \
    TripSegment, TripDailyLog, TripDailyLogEntry, TripStop


class TripLocationInline(admin.TabularInline):
    model = TripLocation
    extra = 0


class TripRouteInline(admin.StackedInline):
    model = TripRoute
    extra = 0
    can_delete = False


class TripSegmentInline(admin.TabularInline):
    model = TripSegment
    extra = 0
    fields = ("sequence", "status", "start", "end", "hours", "start_miles", "end_miles", "note")
    ordering = ("sequence",)


class TripStopInline(admin.TabularInline):
    model = TripStop
    extra = 0
    fields = ("sequence", "kind", "miles", "label", "status", "scheduled_start", "scheduled_end", "hours", "lat", "lng")
    ordering = ("sequence",)


class TripDailyLogEntryInline(admin.TabularInline):
    model = TripDailyLogEntry
    extra = 0
    fields = ("sequence", "status", "start_hour", "end_hour", "note", "start_miles", "end_miles")
    ordering = ("sequence",)


class TripDailyLogInline(admin.TabularInline):
    model = TripDailyLog
    extra = 0
    fields = ("date", "off_duty_hours", "sleeper_hours", "driving_hours",
              "on_duty_hours", "total_hours", "cycle_hours_after_day", "cycle_remaining")
    ordering = ("date",)
    show_change_link = True


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ("id", "current_location", "pickup_location", "dropoff_location",
                    "status", "current_cycle_used", "start_time", "created")
    list_filter = ("status",)
    search_fields = ("current_location", "pickup_location", "dropoff_location")
    readonly_fields = ("created", "modified")
    inlines = [
        TripLocationInline,
        TripRouteInline,
        TripSegmentInline,
        TripStopInline,
        TripDailyLogInline,
    ]


@admin.register(TripDailyLog)
class TripDailyLogAdmin(admin.ModelAdmin):
    list_display = ("id", "trip", "date", "driving_hours", "on_duty_hours",
                    "total_hours", "cycle_remaining")
    list_filter = ("date",)
    inlines = [TripDailyLogEntryInline]


@admin.register(TripRouteGeometry)
class TripRouteGeometryAdmin(admin.ModelAdmin):
    list_display = ("id", "route", "point_count")
    readonly_fields = ("route", "points")

    def point_count(self, obj):
        return len(obj.points or [])
    point_count.short_description = "points"


# Register remaining models so the admin index is complete.
admin.site.register(TripLocation)
admin.site.register(TripRoute)
admin.site.register(TripSegment)
admin.site.register(TripDailyLogEntry)
admin.site.register(TripStop)

