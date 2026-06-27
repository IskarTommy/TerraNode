from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .services import predict_yield

class PredictYieldView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        result = predict_yield(request.user.id)
        if "error" in result:
            return Response(result, status=400)
        return Response(result)

class SummaryView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response({"message": "System operational, analytics active."})
