
import os

from datetime import datetime, timezone

from dotenv import load_dotenv
from pymongo import MongoClient, DESCENDING
from pymongo.errors import PyMongoError

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = os.getenv("MONGODB_DATABASE", "ai_bpo_interview")

client = None
db = None
interviews_collection = None

if MONGODB_URI:
    client = MongoClient(
        MONGODB_URI,
        serverSelectionTimeoutMS=5000,
    )

    db = client[DATABASE_NAME]
    interviews_collection = db["interviews"]


def check_database_connection():
    """Check whether MongoDB is reachable."""
    if client is None:
        return {
            "connected": False,
            "message": "MONGODB_URI is missing from backend/.env",
        }

    try:
        client.admin.command("ping")
        return {
            "connected": True,
            "database": DATABASE_NAME,
        }
    except PyMongoError as exc:
        return {
            "connected": False,
            "message": str(exc),
        }


def save_interview(
    candidate_name,
    language,
    interview_type,
    difficulty,
    duration_seconds,
    conversation,
    feedback,
):
    """Save one completed interview and its feedback."""
    if interviews_collection is None:
        raise RuntimeError(
            "MongoDB is not configured. Add MONGODB_URI to backend/.env."
        )

    document = {
        "candidate_name": candidate_name,
        "language": language,
        "interview_type": interview_type,
        "difficulty": difficulty,
        "duration_seconds": duration_seconds,
        "conversation": conversation,
        "feedback": feedback,
        "created_at": datetime.now(timezone.utc),
    }

    result = interviews_collection.insert_one(document)

    return str(result.inserted_id)


def get_candidate_interviews(candidate_name, limit=20):
    """Return recent interviews for a candidate."""
    if interviews_collection is None:
        raise RuntimeError("MongoDB is not configured.")

    documents = interviews_collection.find(
        {"candidate_name": candidate_name}
    ).sort(
        "created_at", DESCENDING
    ).limit(
        max(1, min(limit, 100))
    )

    results = []

    for document in documents:
        results.append({
            "id": str(document["_id"]),
            "candidate_name": document["candidate_name"],
            "language": document.get("language", "English"),
            "interview_type": document.get("interview_type", "Voice Process"),
            "difficulty": document.get("difficulty", "Beginner"),
            "duration_seconds": document.get("duration_seconds", 0),
            "feedback": document.get("feedback", ""),
            "conversation": document.get("conversation", []),
            "created_at": document["created_at"].isoformat(),
        })

    return results


def get_candidate_statistics(candidate_name):
    """Calculate basic interview statistics."""
    interviews = get_candidate_interviews(candidate_name, limit=100)

    scores = []

    for interview in interviews:
        feedback = interview.get("feedback", "")

        import re

        match = re.search(
            r"OVERALL SCORE:\s*\**\s*(\d{1,3})\s*/\s*100",
            feedback,
            re.IGNORECASE,
        )

        if match:
            scores.append(min(100, int(match.group(1))))

    return {
        "total_interviews": len(interviews),
        "average_score": (
            round(sum(scores) / len(scores), 1) if scores else None
        ),
        "best_score": max(scores) if scores else None,
        "scored_interviews": len(scores),
    }
