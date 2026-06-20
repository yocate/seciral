from fastapi import APIRouter
from knowledge.database import get_dashboard_stats, get_utilized_frameworks

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats")
def get_dashboard_stats_endpoint():
    try:
        stats = get_dashboard_stats()
        return {"status": "success", "stats": stats}
    except Exception as e:
        print(f"API Error: {e}"); return {"status": "error", "message": "An internal server error occurred."}

@router.get("/frameworks")
def get_dashboard_frameworks():
    try:
        fws = get_utilized_frameworks(10)
        return {"status": "success", "frameworks": fws}
    except Exception as e:
        print(f"API Error: {e}"); return {"status": "error", "message": "An internal server error occurred."}
