"""
AI Coach Router
Endpoints for interacting with AI coaching agents
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.database import get_db
from app.services.llm_client import get_llm_client, LLMClient
from app.services.memory_service import MemoryService
from app.services.cache_service import get_cache_service, CacheService
from app.schemas.coach import (
    CoachRespondRequest,
    CoachRespondResponse,
    CoachRespondMeta,
    CoachNotesRequest,
    CoachNotesResponse,
    ActionItem,
    CoachingInsight
)

router = APIRouter()

# Coach personas for different specialties
COACH_PERSONAS = {
    1: {  # Alan Wozniak - Strategy
        "name": "Alan Wozniak",
        "specialty": "Business Strategy & Problem Solving",
        "personality": "Strategic, analytical, visionary",
        "system_prompt": """You are Alan Wozniak, an expert AI business coach specializing in Business Strategy and Problem Solving. 

Your approach:
- Help clients align their mission with market fit
- Guide strategic planning and decision-making
- Solve business problems systematically
- Focus on long-term sustainable growth

Communication style:
- Professional yet approachable
- Use frameworks and structured thinking
- Ask probing questions to understand the full picture
- Provide actionable, practical advice

Remember: You're part of the 10XCoach.ai platform based on "The Small Business BIG EXIT" methodology."""
    },
    2: {  # Rob Mercer - Sales
        "name": "Rob Mercer",
        "specialty": "Sales",
        "personality": "Energetic, motivational, results-driven",
        "system_prompt": """You are Rob Mercer, an expert AI business coach specializing in Sales.

Your approach:
- Build repeatable, scalable sales processes
- Practice and roleplay sales scenarios
- Optimize lead conversion and closing techniques
- Develop confident sales professionals

Communication style:
- Energetic and motivating
- Use real-world sales examples
- Challenge clients to push their limits
- Celebrate wins and learn from losses

Remember: You're part of the 10XCoach.ai platform based on "The Small Business BIG EXIT" methodology."""
    },
    3: {  # Teresa Lane - Marketing
        "name": "Teresa Lane",
        "specialty": "Marketing",
        "personality": "Creative, data-driven, customer-focused",
        "system_prompt": """You are Teresa Lane, an expert AI business coach specializing in Marketing.

Your approach:
- Position, target, and attract with data-backed campaigns
- Align marketing with customer intent
- Build brand awareness and lead generation
- Measure and optimize marketing ROI

Communication style:
- Creative yet analytical
- Focus on customer psychology
- Use marketing frameworks and best practices
- Balance creativity with measurable results

Remember: You're part of the 10XCoach.ai platform based on "The Small Business BIG EXIT" methodology."""
    },
    4: {  # Jeffrey Wells - Operations
        "name": "Jeffrey Wells",
        "specialty": "Operations",
        "personality": "Methodical, efficient, process-oriented",
        "system_prompt": """You are Jeffrey Wells, an expert AI business coach specializing in Operations.

Your approach:
- Optimize internal processes and workflows
- Improve productivity and reduce costs
- Implement systems and automation
- Build scalable operational infrastructure

Communication style:
- Methodical and structured
- Focus on efficiency and metrics
- Use process improvement frameworks
- Practical, implementable solutions

Remember: You're part of the 10XCoach.ai platform based on "The Small Business BIG EXIT" methodology."""
    },
    5: {  # Hudson Jaxon - Finance
        "name": "Hudson Jaxon",
        "specialty": "Finance",
        "personality": "Analytical, precise, strategic",
        "system_prompt": """You are Hudson Jaxon, an expert AI business coach specializing in Finance.

Your approach:
- Master financial planning and KPIs
- Guide strategic investment decisions
- Risk management and fiscal modeling
- Build financial health and stability

Communication style:
- Analytical and precise
- Use financial frameworks and metrics
- Make complex concepts accessible
- Focus on actionable financial strategies

Remember: You're part of the 10XCoach.ai platform based on "The Small Business BIG EXIT" methodology."""
    },
    6: {  # Chelsea Fox - Culture
        "name": "Chelsea Fox",
        "specialty": "Culture",
        "personality": "Warm, empathetic, people-focused",
        "system_prompt": """You are Chelsea Fox, an expert AI business coach specializing in Culture.

Your approach:
- Create values-driven teams
- Foster engagement and innovation
- Build collaboration across departments
- Develop strong organizational culture

Communication style:
- Warm and empathetic
- Focus on people and relationships
- Use culture-building frameworks
- Balance ideals with practical implementation

Remember: You're part of the 10XCoach.ai platform based on "The Small Business BIG EXIT" methodology."""
    },
    7: {  # Camille Quinn - Customer Centricity
        "name": "Camille Quinn",
        "specialty": "Customer Centricity",
        "personality": "Empathetic, insight-driven, relationship-focused",
        "system_prompt": """You are Camille Quinn, an expert AI business coach specializing in Customer Centricity.

Your approach:
- Design customer-centric experiences
- Turn satisfaction into loyalty
- Build referral systems
- Understand and serve customer needs

Communication style:
- Empathetic and insightful
- Focus on customer journey and experience
- Use customer success frameworks
- Data-informed but human-centered

Remember: You're part of the 10XCoach.ai platform based on "The Small Business BIG EXIT" methodology."""
    },
    8: {  # Tanner Chase - Exit Strategy
        "name": "Tanner Chase",
        "specialty": "Exit Strategy",
        "personality": "Visionary, strategic, long-term focused",
        "system_prompt": """You are Tanner Chase, an expert AI business coach specializing in Exit Strategy.

Your approach:
- Plan for succession or acquisition from Day 1
- Build transferable business value
- Prepare businesses for successful exits
- Strategic long-term positioning

Communication style:
- Visionary and forward-thinking
- Focus on building lasting value
- Use exit planning frameworks
- Balance current operations with future goals

Remember: You're part of the 10XCoach.ai platform based on "The Small Business BIG EXIT" methodology."""
    }
}

# Default persona for unknown coaches
DEFAULT_PERSONA = {
    "name": "10X Coach",
    "specialty": "Business Coaching",
    "personality": "Professional, helpful, insightful",
    "system_prompt": """You are an expert AI business coach on the 10XCoach.ai platform.

Your approach:
- Provide practical, actionable business advice
- Help clients grow and scale their businesses
- Use proven frameworks and methodologies
- Support clients in achieving their goals

Communication style:
- Professional and supportive
- Clear and actionable guidance
- Ask clarifying questions when needed
- Focus on measurable outcomes

Remember: You're based on "The Small Business BIG EXIT" methodology for building businesses worth exiting."""
}


def get_coach_persona(coach_id: int) -> dict:
    """Get the persona for a specific coach"""
    return COACH_PERSONAS.get(coach_id, DEFAULT_PERSONA)


@router.post("/respond", response_model=CoachRespondResponse)
async def coach_respond(
    request: CoachRespondRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a response from an AI coach
    
    This endpoint:
    1. Retrieves conversation context from Redis cache
    2. Retrieves relevant memories for context (if enabled)
    3. Constructs the prompt with coach persona
    4. Generates the response using the LLM
    5. Extracts action items and metadata
    6. Stores the interaction in cache and memory
    """
    llm_client = get_llm_client()
    memory_service = MemoryService(db)
    
    # Get cache service
    try:
        cache = await get_cache_service()
    except Exception:
        cache = None
    
    # Get coach persona
    persona = get_coach_persona(request.coach_id)
    
    # Build context from Redis cache (recent conversation)
    cached_context = []
    if cache and request.session_id:
        try:
            cached_context = await cache.get_recent_messages(
                session_id=request.session_id,
                limit=10
            )
        except Exception as e:
            print(f"Warning: Could not retrieve cached context: {e}")
    elif cache:
        # No session_id, try user-coach context
        try:
            cached_context = await cache.get_user_coach_context(
                user_id=request.user_id,
                coach_id=request.coach_id
            ) or []
        except Exception as e:
            print(f"Warning: Could not retrieve user-coach context: {e}")
    
    # Build context from vector memories if enabled
    memory_context = ""
    if request.include_memory:
        try:
            memories = await memory_service.search_similar(
                user_id=request.user_id,
                coach_id=request.coach_id,
                query=request.text,
                limit=5
            )
            if memories:
                memory_context = "\n\nRelevant context from previous conversations:\n"
                for mem in memories:
                    memory_context += f"- {mem.text}\n"
        except Exception as e:
            print(f"Warning: Could not retrieve memories: {e}")
    
    # Build system prompt
    system_prompt = f"""{persona['system_prompt']}

{memory_context}

When responding:
1. Be helpful and provide actionable advice
2. If you identify specific action items, mention them clearly
3. Stay in character as {persona['name']}
4. Reference the user's context when relevant"""

    # Build conversation history (prefer provided context, then cached)
    history = []
    if request.context:
        history = [{"role": msg.role, "content": msg.content} for msg in request.context]
    elif cached_context:
        history = cached_context
    
    # Generate response
    try:
        response = await llm_client.generate(
            prompt=request.text,
            system_prompt=system_prompt,
            history=history
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM error: {str(e)}")
    
    # Extract metadata using a separate call
    meta = await extract_response_metadata(llm_client, request.text, response.content)
    
    # Store in Redis cache
    if cache:
        try:
            if request.session_id:
                # Store in session context
                await cache.append_message(
                    session_id=request.session_id,
                    user_id=request.user_id,
                    coach_id=request.coach_id,
                    role="user",
                    content=request.text
                )
                await cache.append_message(
                    session_id=request.session_id,
                    user_id=request.user_id,
                    coach_id=request.coach_id,
                    role="assistant",
                    content=response.content
                )
            else:
                # Store in user-coach context
                await cache.append_to_user_coach_context(
                    user_id=request.user_id,
                    coach_id=request.coach_id,
                    role="user",
                    content=request.text
                )
                await cache.append_to_user_coach_context(
                    user_id=request.user_id,
                    coach_id=request.coach_id,
                    role="assistant",
                    content=response.content
                )
        except Exception as e:
            print(f"Warning: Could not cache conversation: {e}")
    
    # Store the interaction in vector memory
    try:
        # Store user message
        await memory_service.store_embedding(
            text=f"User asked: {request.text}",
            user_id=request.user_id,
            coach_id=request.coach_id,
            memory_type="conversation",
            session_id=request.session_id
        )
        
        # Store coach response summary
        if meta.summary:
            await memory_service.store_embedding(
                text=f"Coach {persona['name']} advised: {meta.summary}",
                user_id=request.user_id,
                coach_id=request.coach_id,
                memory_type="insight",
                session_id=request.session_id
            )
    except Exception as e:
        print(f"Warning: Could not store memory: {e}")
    
    return CoachRespondResponse(
        reply_text=response.content,
        meta=meta,
        model=response.model,
        tokens_used=response.usage["total_tokens"]
    )


async def extract_response_metadata(
    llm_client: LLMClient,
    user_message: str,
    coach_response: str
) -> CoachRespondMeta:
    """Extract metadata from the coach's response"""
    
    extraction_prompt = f"""Analyze this coaching conversation and extract metadata.

User message: {user_message}

Coach response: {coach_response}

Return a JSON object with:
- "actions": array of action items, each with "description", "priority" (low/medium/high/urgent), "due_suggestion"
- "summary": brief one-sentence summary of the response
- "topics": array of topic keywords
- "sentiment": user's apparent sentiment (curious, frustrated, motivated, confused, etc.)

Only include actions that were explicitly or implicitly suggested. Be concise."""

    try:
        result = await llm_client.generate_json(
            prompt=extraction_prompt,
            system_prompt="You are a precise metadata extractor. Return only valid JSON.",
        )
        
        actions = [
            ActionItem(
                description=a.get("description", ""),
                priority=a.get("priority", "medium"),
                due_suggestion=a.get("due_suggestion")
            )
            for a in result.get("actions", [])
            if a.get("description")
        ]
        
        return CoachRespondMeta(
            actions=actions,
            summary=result.get("summary"),
            topics=result.get("topics", []),
            sentiment=result.get("sentiment")
        )
    except Exception as e:
        print(f"Warning: Could not extract metadata: {e}")
        return CoachRespondMeta()


@router.post("/notes", response_model=CoachNotesResponse)
async def generate_coach_notes(
    request: CoachNotesRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate coaching notes from a session transcript
    
    Takes a full transcript and returns:
    - Executive summary
    - Key insights
    - Action steps
    - Topics covered
    - Follow-up questions
    """
    llm_client = get_llm_client()
    memory_service = MemoryService(db)
    
    # Get coach persona for context
    persona = get_coach_persona(request.coach_id)
    
    notes_prompt = f"""Analyze this coaching session transcript and generate comprehensive coaching notes.

Coach: {persona['name']} ({persona['specialty']})

Transcript:
{request.transcript}

Generate a JSON response with:
1. "summary": Executive summary of the session (2-3 sentences)
2. "key_insights": Array of insights, each with:
   - "category": "strength", "opportunity", "concern", or "achievement"
   - "insight": The insight itself
   - "recommendation": Optional recommendation
3. "action_steps": Array of action items, each with:
   - "description": Clear action description
   - "priority": "low", "medium", "high", or "urgent"
   - "due_suggestion": Suggested timeframe
4. "topics_covered": Array of main topics discussed
5. "follow_up_questions": Array of questions for the next session
6. "session_score": Engagement/productivity score from 1-100

Be thorough but concise. Focus on actionable insights."""

    try:
        result = await llm_client.generate_json(
            prompt=notes_prompt,
            system_prompt="You are an expert coaching notes analyzer. Return comprehensive, well-structured JSON.",
            max_tokens=2000
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM error: {str(e)}")
    
    # Parse insights
    key_insights = [
        CoachingInsight(
            category=i.get("category", "insight"),
            insight=i.get("insight", ""),
            recommendation=i.get("recommendation")
        )
        for i in result.get("key_insights", [])
        if i.get("insight")
    ]
    
    # Parse action steps
    action_steps = [
        ActionItem(
            description=a.get("description", ""),
            priority=a.get("priority", "medium"),
            due_suggestion=a.get("due_suggestion")
        )
        for a in result.get("action_steps", [])
        if a.get("description")
    ]
    
    # Store key insights in memory
    try:
        summary = result.get("summary", "")
        if summary:
            await memory_service.store_embedding(
                text=f"Session summary with {persona['name']}: {summary}",
                user_id=request.user_id,
                coach_id=request.coach_id,
                memory_type="insight",
                session_id=request.session_id
            )
        
        # Store action items
        for action in action_steps[:3]:  # Top 3 actions
            await memory_service.store_embedding(
                text=f"Action item: {action.description}",
                user_id=request.user_id,
                coach_id=request.coach_id,
                memory_type="action",
                session_id=request.session_id
            )
    except Exception as e:
        print(f"Warning: Could not store notes in memory: {e}")
    
    return CoachNotesResponse(
        summary=result.get("summary", "Session notes generated."),
        key_insights=key_insights,
        action_steps=action_steps,
        topics_covered=result.get("topics_covered", []),
        follow_up_questions=result.get("follow_up_questions", []),
        session_score=result.get("session_score")
    )


@router.get("/memory/{user_id}/{coach_id}")
async def get_user_memories(
    user_id: int,
    coach_id: int,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """Get recent memories for a user-coach pair"""
    memory_service = MemoryService(db)
    
    memories = await memory_service.get_recent_context(
        user_id=user_id,
        coach_id=coach_id,
        limit=limit
    )
    
    return {"memories": memories}


@router.delete("/memory/{user_id}/{coach_id}")
async def clear_user_memories(
    user_id: int,
    coach_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Clear all memories for a user-coach pair"""
    memory_service = MemoryService(db)
    
    await memory_service.delete_user_memories(
        user_id=user_id,
        coach_id=coach_id
    )
    
    return {"message": "Memories cleared successfully"}

