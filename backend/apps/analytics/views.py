from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .services import predict_yield, CROP_PROFILES

class PredictYieldView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        crop_type = request.query_params.get("crop_type", "MAIZE")

        simulated = None
        if "sim_temp" in request.query_params or "sim_moisture" in request.query_params or "sim_ph" in request.query_params:
            simulated = {
                "temp": request.query_params.get("sim_temp"),
                "moisture": request.query_params.get("sim_moisture"),
                "ph": request.query_params.get("sim_ph")
            }

        result = predict_yield(request.user.id, crop_type=crop_type, simulated_params=simulated)
        if "error" in result:
            return Response(result, status=400)
        return Response(result)

class SummaryView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response({
            "message": "Analytics engine operational",
            "status": "OPERATIONAL",
            "available_crop_profiles": list(CROP_PROFILES.keys()),
            "cache_backend": "Active",
            "model_version": "v2.1-WeightedMovingAverage"
        })
