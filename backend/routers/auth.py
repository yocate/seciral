import os
import uuid
import datetime
import bcrypt
import jwt
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from knowledge.database import (
    create_user, get_user_by_email, get_user_by_id, update_user_profile
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "super-secret-key-for-sip-auth")
ALGORITHM = "HS256"

class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: str
    department: str
    career: str
    characteristics: str

@router.post("/register")
def register(req: RegisterRequest):
    if get_user_by_email(req.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(req.password.encode('utf-8'), salt).decode('utf-8')
    create_user(user_id, req.email, password_hash, req.display_name, req.department, req.career, req.characteristics)
    
    token = jwt.encode(
        {"sub": user_id, "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)},
        SECRET_KEY, algorithm=ALGORITHM
    )
    return {"status": "success", "token": token, "user": {"id": user_id, "email": req.email, "display_name": req.display_name, "department": req.department, "career": req.career, "characteristics": req.characteristics}}


class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(req: LoginRequest):
    user = get_user_by_email(req.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    is_valid = bcrypt.checkpw(req.password.encode('utf-8'), user["password_hash"].encode('utf-8'))
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = jwt.encode(
        {"sub": user["id"], "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)},
        SECRET_KEY, algorithm=ALGORITHM
    )
    return {"status": "success", "token": token, "user": {
        "id": user["id"], "email": user["email"], "display_name": user["display_name"], "department": user["department"],
        "career": user["career"], "characteristics": user["characteristics"],
        "big5_openness": user.get("big5_openness"), "big5_conscientiousness": user.get("big5_conscientiousness"),
        "big5_extraversion": user.get("big5_extraversion"), "big5_agreeableness": user.get("big5_agreeableness"),
        "big5_neuroticism": user.get("big5_neuroticism"), "strategic_persona": user.get("strategic_persona")
    }}


class UserProfileUpdateRequest(BaseModel):
    user_id: str
    display_name: str
    department: str
    career: str
    characteristics: str
    big5_openness: Optional[int] = None
    big5_conscientiousness: Optional[int] = None
    big5_extraversion: Optional[int] = None
    big5_agreeableness: Optional[int] = None
    big5_neuroticism: Optional[int] = None
    mbti_type: Optional[str] = None

@router.put("/profile")
def update_profile(req: UserProfileUpdateRequest):
    user = get_user_by_id(req.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_user_profile(
        req.user_id, req.display_name, req.department, req.career, req.characteristics,
        req.big5_openness, req.big5_conscientiousness, req.big5_extraversion, req.big5_agreeableness, req.big5_neuroticism,
        None, req.mbti_type
    )
    updated_user = get_user_by_id(req.user_id)
    return {"status": "success", "user": {
        "id": updated_user["id"], "email": updated_user["email"], "display_name": updated_user["display_name"], "department": updated_user["department"],
        "career": updated_user["career"], "characteristics": updated_user["characteristics"],
        "big5_openness": updated_user.get("big5_openness"), "big5_conscientiousness": updated_user.get("big5_conscientiousness"),
        "big5_extraversion": updated_user.get("big5_extraversion"), "big5_agreeableness": updated_user.get("big5_agreeableness"),
        "big5_neuroticism": updated_user.get("big5_neuroticism"), "strategic_persona": updated_user.get("strategic_persona"),
        "mbti_type": updated_user.get("mbti_type")
    }}


class PersonaGenerateRequest(BaseModel):
    mbti_type: str

@router.post("/profile/{user_id}/persona/generate")
def generate_persona_endpoint(user_id: str, request: PersonaGenerateRequest = None):
    # Generating persona based on MBTI rules locally without GenAI for speed
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    mbti = request.mbti_type if request and request.mbti_type else (user.get('mbti_type') or "不明")
    
    personas = {
        "INTJ": "💡 建築家型 (INTJ) - 独自の戦略と論理性を重んじるが、感情的な人間関係の構築が盲点になりやすい",
        "INTP": "💡 論理学者型 (INTP) - 斬新なパターンの発見に長けるが、実行フェーズでのルーチン作業が盲点になりやすい",
        "ENTJ": "💡 指揮官型 (ENTJ) - 目標達成への推進力と決断力に優れるが、他者の感情的ケアが盲点になりやすい",
        "ENTP": "💡 討論者型 (ENTP) - 既存の枠組みを壊すアイデア出しに優れるが、アイデアの完遂と継続性が盲点になりやすい",
        "INFJ": "💡 提唱者型 (INFJ) - 深い洞察と理想に基づき戦略を描くが、現実的なリソース制約への対処が盲点になりやすい",
        "INFP": "💡 仲介者型 (INFP) - 価値観と人間性を重視したビジョンを描くが、冷徹な論理的決断が盲点になりやすい",
        "ENFJ": "💡 主人公型 (ENFJ) - 人を巻き込むカリスマ性と共感性に優れるが、データに基づく冷徹な分析が盲点になりやすい",
        "ENFP": "💡 運動家型 (ENFP) - 熱意で人を動かす新しい挑戦に長けるが、細部の管理と計画の完遂が盲点になりやすい",
        "ISTJ": "💡 管理者型 (ISTJ) - 過去の実績と事実に基づく堅実な運用に優れるが、前例のない革新的な変化が盲点になりやすい",
        "ISFJ": "💡 擁護者型 (ISFJ) - 組織の調和と着実なサポートに優れるが、急激な方針転換やリスクテイクが盲点になりやすい",
        "ESTJ": "💡 幹部型 (ESTJ) - 秩序と効率を重んじた組織運営に優れるが、柔軟な対応や個人の感情的配慮が盲点になりやすい",
        "ESFJ": "💡 領事官型 (ESFJ) - チームの士気向上と協調性に優れるが、対立を伴う厳しい決断が盲点になりやすい",
        "ISTP": "💡 巨匠型 (ISTP) - 目の前の課題に対する実践的な問題解決に優れるが、長期的なビジョンの共有が盲点になりやすい",
        "ISFP": "💡 冒険家型 (ISFP) - 柔軟な感性と適応力でアプローチするが、厳格な長期計画の策定が盲点になりやすい",
        "ESTP": "💡 起業家型 (ESTP) - リスクを恐れず機会を逃さない行動力に優れるが、長期的な戦略とリスクヘッジが盲点になりやすい",
        "ESFP": "💡 エンターテイナー型 (ESFP) - 現場の熱量とコミュニケーションに優れるが、複雑な理論や長期的な分析が盲点になりやすい"
    }
    
    persona = personas.get(mbti, f"💡 未知のタイプ ({mbti}) - 情報が不足しており分析できません")
    
    try:
        update_user_profile(user_id=user_id, strategic_persona=persona)
        updated_user = get_user_by_id(user_id)
        return {"status": "success", "strategic_persona": persona, "user": updated_user}
    except Exception as e:
        print(f"Error generating persona: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate persona")
