import os
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from groq import Groq

from database import (
    check_database_connection,
    save_interview,
    get_candidate_interviews,
    get_candidate_statistics,
    interviews_collection,
)

#Load environment variables

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

# Initialize FastAPI

app = FastAPI(
    title="AI BPO Voice Interview API",
    description="AI-powered voice interview backend with MongoDB history.",
    version="2.0.0",
)

# CORS configuration

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://ai-voice-interview-three.vercel.app",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client

groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# Request models

class InterviewStartRequest(BaseModel):
    candidate_name: str = "Candidate"
    language: str = "English"
    interview_type: str = "Voice Process"
    difficulty: str = "Beginner"


class Message(BaseModel):
    role: str
    content: str


class InterviewReplyRequest(BaseModel):
    candidate_name: str = "Candidate"
    language: str = "English"
    interview_type: str = "Voice Process"
    difficulty: str = "Beginner"
    conversation: List[Message] = Field(default_factory=list)
    user_message: str


class InterviewFeedbackRequest(BaseModel):
    candidate_name: str = "Candidate"
    language: str = "English"
    interview_type: str = "Voice Process"
    difficulty: str = "Beginner"
    duration_seconds: int = 0
    conversation: List[Message] = Field(default_factory=list)


#Interview system prompt


def get_system_prompt(
    candidate_name: str,
    language: str,
    interview_type: str,
    difficulty: str,
) -> str:
    return f"""
You are a professional AI interviewer conducting a realistic job interview.

Candidate name: {candidate_name}
Interview type: {interview_type}
Language: {language}
Difficulty: {difficulty}

RULES:
1. Conduct the interview like a real human interviewer.
2. Ask one question at a time.
3. Keep your questions short and easy to understand.
4. For a BPO Voice Process interview, focus on:
   - Self-introduction
   - Communication skills
   - Customer handling
   - Customer satisfaction
   - Problem-solving
   - Handling angry customers
   - Teamwork
   - Basic situational questions
5. Adjust the difficulty according to the selected level.
6. Do not provide the answer before the candidate responds.
7. Respond in the selected language.
8. Be polite, professional, and encouraging.
9. Do not ask multiple unrelated questions together.
10. When the candidate gives an unclear answer, ask a relevant follow-up.
11. Start by greeting the candidate and asking for their introduction.
12. Keep responses concise so they work well with voice synthesis.
"""

# Generate AI response using Groq
def generate_ai_response(
    system_prompt: str,
    messages: list,
) -> str:
    if groq_client is None:
        raise HTTPException(
            status_code=503,
            detail="Groq API key is missing. Check backend/.env.",
        )

    try:
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                *messages,
            ],
            temperature=0.7,
            max_completion_tokens=1200,
        )

        answer = response.choices[0].message.content

        if not answer:
            raise HTTPException(
                status_code=502,
                detail="The AI returned an empty response.",
            )

        return answer.strip()

    except HTTPException:
        raise

    except Exception as exc:
        print(f"Groq API error: {exc}")
        raise HTTPException(
            status_code=502,
            detail="Could not generate an AI response. Please try again.",
        )

# Home endpoint


@app.get("/")
def home():
    return {
        "message": "AI BPO Interview Backend is running!",
        "version": "2.0.0",
    }

# Health check


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "AI BPO Voice Interview API",
    }

# Test endpoint


@app.get("/api/test")
def test_api():
    return {
        "success": True,
        "message": "API is working correctly!",
    }

# Check AI configuration

@app.get("/api/ai/status")
def ai_status():
    return {
        "configured": groq_client is not None,
        "model": GROQ_MODEL,
    }

#Start interview


@app.post("/api/interview/start")
def start_interview(request: InterviewStartRequest):
    system_prompt = get_system_prompt(
        candidate_name=request.candidate_name,
        language=request.language,
        interview_type=request.interview_type,
        difficulty=request.difficulty,
    )

    greeting = generate_ai_response(
        system_prompt=system_prompt,
        messages=[
            {
                "role": "user",
                "content": (
                    "Start the interview now. Greet the candidate "
                    "and ask the first question."
                ),
            }
        ],
    )

    return {
        "success": True,
        "candidate_name": request.candidate_name,
        "message": greeting,
    }

# 13. Continue interview

@app.post("/api/interview/respond")
def respond_to_interview(request: InterviewReplyRequest):
    system_prompt = get_system_prompt(
        candidate_name=request.candidate_name,
        language=request.language,
        interview_type=request.interview_type,
        difficulty=request.difficulty,
    )

    conversation_messages = []

    for message in request.conversation:
        if message.role not in ("user", "assistant"):
            continue

        conversation_messages.append(
            {
                "role": message.role,
                "content": message.content,
            }
        )

    # Add the latest candidate response.
    conversation_messages.append(
        {
            "role": "user",
            "content": request.user_message,
        }
    )

    ai_reply = generate_ai_response(
        system_prompt=system_prompt,
        messages=conversation_messages,
    )

    return {
        "success": True,
        "reply": ai_reply,
    }

# Generate interview feedback and save to MongoDB


@app.post("/api/interview/feedback")
def generate_interview_feedback(
    request: InterviewFeedbackRequest,
):
    system_prompt = f"""
You are an experienced BPO interview evaluator.

Evaluate the candidate based on the interview conversation below.

Candidate name: {request.candidate_name}
Interview type: {request.interview_type}
Language: {request.language}
Difficulty: {request.difficulty}

Provide a complete, honest, constructive report in this exact structure:

OVERALL SCORE: XX/100

COMMUNICATION: XX/100
Evaluate language, fluency, grammar, and ability to communicate.

CLARITY: XX/100
Evaluate how clearly the candidate explains their answers.

CONFIDENCE: XX/100
Evaluate confidence based only on the available responses.
Do not claim to measure actual vocal confidence if audio features
are not provided.

ANSWER QUALITY: XX/100
Evaluate relevance, completeness, and professionalism.

STRENGTHS:
List 3 specific strengths demonstrated in the conversation.

AREAS TO IMPROVE:
List 3 specific areas that need improvement.

SUGGESTIONS:
Give 3 practical suggestions for the next interview.

FINAL SUMMARY:
Write a short professional summary and state whether the
candidate appears ready for a BPO Voice Process interview.

IMPORTANT:
- Give integer scores between 0 and 100.
- Base your evaluation on the provided conversation.
- Do not invent answers or experience.
- If the conversation contains too little information, mention that.
- Keep the report constructive and easy to understand.
- Return the complete report with every section.
"""

    conversation_text = "\n".join(
        f"{message.role.upper()}: {message.content}"
        for message in request.conversation
        if message.role in ("user", "assistant")
    )

    if not conversation_text.strip():
        raise HTTPException(
            status_code=400,
            detail="The interview conversation is empty.",
        )

    feedback = generate_ai_response(
        system_prompt=system_prompt,
        messages=[
            {
                "role": "user",
                "content": (
                    "Evaluate this interview conversation:\n\n"
                    f"{conversation_text}"
                ),
            }
        ],
    )

    # Save the completed interview and feedback.
    try:
        interview_id = save_interview(
            candidate_name=request.candidate_name,
            language=request.language,
            interview_type=request.interview_type,
            difficulty=request.difficulty,
            duration_seconds=max(0, request.duration_seconds),
            conversation=[
                message.model_dump()
                for message in request.conversation
            ],
            feedback=feedback,
        )

    except Exception as exc:
        print(f"Interview save error: {exc}")

        raise HTTPException(
            status_code=500,
            detail=(
                "Feedback was generated, but the interview "
                "could not be saved. Check MongoDB configuration."
            ),
        )

    return {
        "success": True,
        "candidate_name": request.candidate_name,
        "interview_id": interview_id,
        "feedback": feedback,
    }

# MongoDB connection status

@app.get("/api/database/status")
def database_status():
    result = check_database_connection()

    if not result.get("connected"):
        raise HTTPException(
            status_code=503,
            detail=result.get(
                "message",
                "MongoDB is not connected.",
            ),
        )

    return result

#Get candidate interview history


@app.get("/api/interview/history/{candidate_name}")
def interview_history(
    candidate_name: str,
    limit: int = 20,
):
    try:
        interviews = get_candidate_interviews(
            candidate_name=candidate_name,
            limit=limit,
        )

        return {
            "success": True,
            "count": len(interviews),
            "interviews": interviews,
        }

    except Exception as exc:
        print(f"Interview history error: {exc}")

        raise HTTPException(
            status_code=500,
            detail="Could not retrieve interview history.",
        )

# Get candidate statistics

@app.get("/api/interview/statistics/{candidate_name}")
def interview_statistics(candidate_name: str):
    try:
        statistics = get_candidate_statistics(
            candidate_name=candidate_name,
        )

        return {
            "success": True,
            "statistics": statistics,
        }

    except Exception as exc:
        print(f"Interview statistics error: {exc}")

        raise HTTPException(
            status_code=500,
            detail="Could not retrieve interview statistics.",
        )

# Admin dashboard endpoints (local prototype)

import re
from datetime import datetime, timezone
from bson import ObjectId
from pymongo.errors import PyMongoError

def _admin_score(feedback: str):
    match = re.search(
        r"OVERALL SCORE:\s*\**\s*(\d{1,3})\s*/\s*100",
        str(feedback or ""),
        re.IGNORECASE,
    )
    return min(100, int(match.group(1))) if match else None

def _admin_interview_document(document):
    return {
        "id": str(document.get("_id", "")),
        "candidate_name": document.get("candidate_name", "Candidate"),
        "email": document.get("email") or "—",
        "language": document.get("language", "English"),
        "interview_type": document.get("interview_type", "Voice Process"),
        "difficulty": document.get("difficulty", "Beginner"),
        "duration_seconds": document.get("duration_seconds", 0),
        "conversation": document.get("conversation", []),
        "feedback": document.get("feedback", ""),
        "score": _admin_score(document.get("feedback", "")),
        "created_at": (
            document["created_at"].isoformat()
            if hasattr(document.get("created_at"), "isoformat")
            else document.get("created_at")
        ),
    }

@app.get("/api/admin/overview")
def admin_overview():
    """Return aggregate data for the admin dashboard.

    Prototype endpoint: protect with verified Firebase admin authorization
    before deploying this API publicly.
    """
    if interviews_collection is None:
        raise HTTPException(status_code=503, detail="MongoDB is not configured.")

    try:
        documents = list(interviews_collection.find({}).sort("created_at", -1).limit(5000))
        names = {
            str(doc.get("candidate_name", "")).strip()
            for doc in documents
            if str(doc.get("candidate_name", "")).strip()
        }
        scores = [
            score for score in (_admin_score(doc.get("feedback", "")) for doc in documents)
            if score is not None
        ]
        today = datetime.now(timezone.utc).date()
        todays_count = 0
        recent = []
        for doc in documents:
            created_at = doc.get("created_at")
            if created_at and hasattr(created_at, "date") and created_at.date() == today:
                todays_count += 1
            if len(recent) < 10:
                recent.append(_admin_interview_document(doc))

        return {
            "success": True,
            "statistics": {
                "total_candidates": len(names),
                "total_interviews": len(documents),
                "average_score": round(sum(scores) / len(scores), 1) if scores else None,
                "today_interviews": todays_count,
            },
            "recent_interviews": recent,
        }
    except PyMongoError as exc:
        print(f"Admin overview database error: {exc}")
        raise HTTPException(status_code=503, detail="Could not load admin overview.")

@app.get("/api/admin/interviews")
def admin_interviews(limit: int = 100, search: str = ""):
    """List recent interviews with optional candidate-name filtering."""
    if interviews_collection is None:
        raise HTTPException(status_code=503, detail="MongoDB is not configured.")
    try:
        query = {}
        if search.strip():
            query["candidate_name"] = {"$regex": re.escape(search.strip()), "$options": "i"}
        documents = interviews_collection.find(query).sort("created_at", -1).limit(max(1, min(limit, 500)))
        return {"success": True, "interviews": [_admin_interview_document(doc) for doc in documents]}
    except PyMongoError as exc:
        print(f"Admin interviews database error: {exc}")
        raise HTTPException(status_code=503, detail="Could not load interviews.")

@app.get("/api/admin/interviews/{interview_id}")
def admin_interview_detail(interview_id: str):
    """Return one interview's transcript and feedback."""
    if interviews_collection is None:
        raise HTTPException(status_code=503, detail="MongoDB is not configured.")
    if not ObjectId.is_valid(interview_id):
        raise HTTPException(status_code=400, detail="Invalid interview ID.")
    try:
        document = interviews_collection.find_one({"_id": ObjectId(interview_id)})
        if not document:
            raise HTTPException(status_code=404, detail="Interview not found.")
        return {"success": True, "interview": _admin_interview_document(document)}
    except PyMongoError as exc:
        print(f"Admin interview detail error: {exc}")
        raise HTTPException(status_code=503, detail="Could not load interview details.")
