from rest_framework.views import exception_handler

def custom_exception_handler(exc, context):
    """
    Wraps all DRF error responses in a consistent format:
    {
        "success": false,
        "error": {
            "code": "VALIDATION_ERROR",
            "message": "...",
            "details": { ... }
        }
    }
    """
    response = exception_handler(exc, context)
    if response is not None:
        response.data = {
            "success": False,
            "error": {
                "code": response.status_code,
                "message": str(exc),
                "details": response.data,
            }
        }
    return response
