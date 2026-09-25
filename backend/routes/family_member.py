from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import SessionLocal
from models.family_member import FamilyMember
from schemas.family_member import FamilyMemberCreate, FamilyMemberResponse, FamilyMemberUpdate

router = APIRouter(
    prefix="/family-members",
    tags=["Family Members"]
)


# Database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Get family members for a patient
@router.get("/patient/{patient_id}", response_model=List[FamilyMemberResponse])
def get_patient_family_members(
    patient_id: int,
    db: Session = Depends(get_db)
):
    members = (
        db.query(FamilyMember)
        .filter(FamilyMember.patient_id == patient_id)
        .all()
    )
    return members


# Create family member for a patient
@router.post("/patient/{patient_id}", response_model=FamilyMemberResponse)
def create_patient_family_member(
    patient_id: int,
    member_data: FamilyMemberCreate,
    db: Session = Depends(get_db)
):
    new_member = FamilyMember(
        patient_id=patient_id,
        name=member_data.name,
        relationship=member_data.relationship,
        photo_url=member_data.photo_url,
        preferred_display_name=member_data.preferred_display_name,
        active=member_data.active if member_data.active is not None else True
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member


# Update family member
@router.put("/{member_id}", response_model=FamilyMemberResponse)
def update_family_member(
    member_id: int,
    member_data: FamilyMemberUpdate,
    db: Session = Depends(get_db)
):
    member = (
        db.query(FamilyMember)
        .filter(FamilyMember.id == member_id)
        .first()
    )
    if not member:
        raise HTTPException(
            status_code=404,
            detail="Family member not found"
        )

    if member_data.name is not None:
        member.name = member_data.name
    if member_data.relationship is not None:
        member.relationship = member_data.relationship
    if member_data.photo_url is not None:
        member.photo_url = member_data.photo_url
    if member_data.preferred_display_name is not None:
        member.preferred_display_name = member_data.preferred_display_name
    if member_data.active is not None:
        member.active = member_data.active

    db.commit()
    db.refresh(member)
    return member


# Delete family member
@router.delete("/{member_id}")
def delete_family_member(
    member_id: int,
    db: Session = Depends(get_db)
):
    member = (
        db.query(FamilyMember)
        .filter(FamilyMember.id == member_id)
        .first()
    )
    if not member:
        raise HTTPException(
            status_code=404,
            detail="Family member not found"
        )

    db.delete(member)
    db.commit()
    return {"message": "Family member deleted successfully", "id": member_id}
