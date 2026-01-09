"""
Pydantic schemas for AI Coach endpoints
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class ContextMessage(BaseModel):
    """A message in the conversation context"""
    role: str = Field(..., description="Message role: user, assistant, or system")
    content: str = Field(..., description="Message content")


class CoachRespondRequest(BaseModel):
    """Request body for POST /ai/coach/respond"""
    user_id: int = Field(..., description="User ID")
    coach_id: int = Field(..., description="Coach ID")
    text: str = Field(..., description="User's message text")
    context: Optional[List[ContextMessage]] = Field(
        default=None,
        description="Optional conversation history for context"
    )
    session_id: Optional[int] = Field(
        default=None,
        description="Optional session ID to associate with this conversation"
    )
    include_memory: bool = Field(
        default=True,
        description="Whether to include relevant memories in context"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "coach_id": 1,
                "text": "How can I improve my sales process?",
                "context": [
                    {"role": "user", "content": "I'm struggling with lead conversion"},
                    {"role": "assistant", "content": "Let's analyze your current funnel..."}
                ],
                "session_id": 123,
                "include_memory": True
            }
        }


class ActionItem(BaseModel):
    """An action item extracted from the conversation"""
    description: str = Field(..., description="Action item description")
    priority: str = Field(default="medium", description="Priority: low, medium, high, urgent")
    due_suggestion: Optional[str] = Field(
        default=None,
        description="Suggested timeframe for completion"
    )


class CoachRespondMeta(BaseModel):
    """Metadata from coach response"""
    actions: List[ActionItem] = Field(
        default_factory=list,
        description="Suggested action items from this response"
    )
    summary: Optional[str] = Field(
        default=None,
        description="Brief summary of the response"
    )
    topics: List[str] = Field(
        default_factory=list,
        description="Topics discussed"
    )
    sentiment: Optional[str] = Field(
        default=None,
        description="User sentiment detected"
    )


class CoachRespondResponse(BaseModel):
    """Response body for POST /ai/coach/respond"""
    reply_text: str = Field(..., description="The coach's response")
    meta: CoachRespondMeta = Field(..., description="Response metadata")
    model: str = Field(..., description="LLM model used")
    tokens_used: int = Field(..., description="Total tokens used")
    
    class Config:
        json_schema_extra = {
            "example": {
                "reply_text": "Great question! Let me help you optimize your sales process...",
                "meta": {
                    "actions": [
                        {
                            "description": "Map out your current sales funnel stages",
                            "priority": "high",
                            "due_suggestion": "This week"
                        }
                    ],
                    "summary": "Discussed sales process optimization strategies",
                    "topics": ["sales", "lead conversion", "funnel optimization"],
                    "sentiment": "curious"
                },
                "model": "gpt-4-turbo-preview",
                "tokens_used": 450
            }
        }


class CoachNotesRequest(BaseModel):
    """Request body for POST /ai/coach/notes"""
    user_id: int = Field(..., description="User ID")
    coach_id: int = Field(..., description="Coach ID")
    session_id: Optional[int] = Field(default=None, description="Session ID")
    transcript: str = Field(..., description="Full conversation transcript")
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "coach_id": 1,
                "session_id": 123,
                "transcript": "User: How can I improve sales?\nCoach: Let's start by analyzing..."
            }
        }


class CoachingInsight(BaseModel):
    """A key insight from the coaching session"""
    category: str = Field(..., description="Insight category (e.g., 'strength', 'opportunity', 'concern')")
    insight: str = Field(..., description="The insight itself")
    recommendation: Optional[str] = Field(default=None, description="Related recommendation")


class CoachNotesResponse(BaseModel):
    """Response body for POST /ai/coach/notes"""
    summary: str = Field(..., description="Executive summary of the session")
    key_insights: List[CoachingInsight] = Field(
        ...,
        description="Key insights from the conversation"
    )
    action_steps: List[ActionItem] = Field(
        ...,
        description="Recommended action steps"
    )
    topics_covered: List[str] = Field(..., description="Main topics discussed")
    follow_up_questions: List[str] = Field(
        default_factory=list,
        description="Suggested follow-up questions for next session"
    )
    session_score: Optional[int] = Field(
        default=None,
        description="Session engagement score (1-100)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "summary": "Productive session focused on sales optimization...",
                "key_insights": [
                    {
                        "category": "opportunity",
                        "insight": "Lead qualification process needs refinement",
                        "recommendation": "Implement BANT framework"
                    }
                ],
                "action_steps": [
                    {
                        "description": "Create lead scoring system",
                        "priority": "high",
                        "due_suggestion": "Next 2 weeks"
                    }
                ],
                "topics_covered": ["sales", "lead generation", "conversion"],
                "follow_up_questions": [
                    "How has the new lead scoring impacted conversion rates?"
                ],
                "session_score": 85
            }
        }

