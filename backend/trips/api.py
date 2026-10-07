from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.utils import get_response_format, convert_data
from trips import helpers


@api_view(["GET"])
@permission_classes([AllowAny])
def healthcheck(request):
    response = get_response_format()
    response["success"] = True
    response["data"]["status"] = "ok"
    response["data"]["service"] = "routelog"
    
    return Response(response)


@api_view(["POST"])
@permission_classes([AllowAny])
def plan_trip(request):
    response = get_response_format()
    post_data = convert_data(request.body)
    if not post_data:
        response["errors"].append("Unable to decode data.")
        response["error_code"] = 100406
        return Response(response)

    return Response(helpers.plan_trip(post_data))


@api_view(["POST"])
@permission_classes([AllowAny])
def get_trip(request):
    response = get_response_format()
    post_data = convert_data(request.body)
    if not post_data:
        response["errors"].append("Unable to decode data.")
        response["error_code"] = 100406
        
        return Response(response)
    
    return Response(helpers.get_trip(post_data))


@api_view(["POST"])
@permission_classes([AllowAny])
def list_trips(request):
    post_data = convert_data(request.body) or {}
    
    return Response(helpers.list_trips(post_data))


@api_view(["POST"])
@permission_classes([AllowAny])
def geocode(request):
    response = get_response_format()
    post_data = convert_data(request.body)
    if not post_data:
        response["errors"].append("Unable to decode data.")
        response["error_code"] = 100406
        
        return Response(response)
    
    return Response(helpers.geocode_lookup(post_data))


@api_view(["POST"])
@permission_classes([AllowAny])
def daily_log(request):
    response = get_response_format()
    post_data = convert_data(request.body)
    if not post_data:
        response["errors"].append("Unable to decode data.")
        response["error_code"] = 100406
        
        return Response(response)
    
    return Response(helpers.get_daily_log(post_data))