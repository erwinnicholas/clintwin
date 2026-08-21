from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from core.database import get_db_connection
import uuid

router = APIRouter()


class HospitalRuleCreate(BaseModel):
    name: str
    category: str
    rule_text: str
    source: str = ""
    severity: str = "Mandatory"


class HospitalRuleResponse(BaseModel):
    rule_id: str
    name: str
    category: str
    rule_text: str
    source: str
    severity: str
    is_active: bool
    created_at: str


@router.get("/", response_model=List[HospitalRuleResponse])
async def list_hospital_rules():
    with get_db_connection() as conn:
        rows = conn.execute("SELECT * FROM hospital_rules ORDER BY created_at DESC").fetchall()
        return [HospitalRuleResponse(
            rule_id=r["rule_id"],
            name=r["name"],
            category=r["category"],
            rule_text=r["rule_text"],
            source=r["source"],
            severity=r["severity"],
            is_active=bool(r["is_active"]),
            created_at=r["created_at"]
        ) for r in rows]


@router.post("/", response_model=HospitalRuleResponse)
async def create_hospital_rule(request: HospitalRuleCreate):
    rule_id = f"HR-{uuid.uuid4().hex[:6].upper()}"
    now = datetime.now().isoformat()
    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO hospital_rules (rule_id, name, category, rule_text, source, severity, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)",
            (rule_id, request.name, request.category, request.rule_text, request.source, request.severity, now)
        )
        conn.commit()
    return HospitalRuleResponse(
        rule_id=rule_id, name=request.name, category=request.category,
        rule_text=request.rule_text, source=request.source, severity=request.severity,
        is_active=True, created_at=now
    )


@router.delete("/{rule_id}")
async def delete_hospital_rule(rule_id: str):
    with get_db_connection() as conn:
        conn.execute("DELETE FROM hospital_rules WHERE rule_id = ?", (rule_id,))
        conn.commit()
    return {"status": "success", "message": f"Rule {rule_id} deleted."}
