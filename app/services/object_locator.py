from .llm import llm_service
import json
import re
from ..database import models
from sqlalchemy.orm import Session
from datetime import datetime

class ObjectLocatorService:
    def parse_object_data(self, text):
        prompt = f"""
        Extract object location details from: "{text}"
        Return JSON object with:
        - object: object name
        - location: location description
        
        Only return the JSON.
        """
        response = llm_service.generate_response(prompt)
        try:
            match = re.search(r'\{.*\}', response, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
                return {"object": data.get("object"), "location": data.get("location")}
            return {}
        except:
            return {}

    def save_location(self, db: Session, object_name, location):
        db_location = models.ObjectLocation(
            object_name=object_name,
            location=location
        )
        db.add(db_location)
        db.commit()
        db.refresh(db_location)
        return db_location

    def find_location(self, db: Session, object_name):
        # Find latest location for this object
        return db.query(models.ObjectLocation).filter(
            models.ObjectLocation.object_name.ilike(f"%{object_name}%")
        ).order_by(models.ObjectLocation.timestamp.desc()).first()

    def get_all_locations(self, db: Session):
        return db.query(models.ObjectLocation).order_by(models.ObjectLocation.timestamp.desc()).all()

    def update_location(self, db: Session, loc_id: int, data: dict):
        db_location = db.query(models.ObjectLocation).filter(models.ObjectLocation.id == loc_id).first()
        if db_location:
            db_location.object_name = data.get('object', db_location.object_name)
            db_location.location = data.get('location', db_location.location)
            db.commit()
            db.refresh(db_location)
        return db_location

    def delete_location(self, db: Session, loc_id: int):
        db_location = db.query(models.ObjectLocation).filter(models.ObjectLocation.id == loc_id).first()
        if db_location:
            db.delete(db_location)
            db.commit()
        return db_location

object_locator_service = ObjectLocatorService()
