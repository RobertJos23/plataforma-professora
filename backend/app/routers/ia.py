from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from app.core.security import get_current_user_id
from app.core.config import settings

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────

class ChatMessage(BaseModel):
    message: str
    conversation_history: list[dict] = []


class EssayRequest(BaseModel):
    text: str
    level: str = "B1"
    focus: str = "general"  # grammar, vocabulary, fluency, general


class ExerciseGenerationRequest(BaseModel):
    topic: str
    level: str = "B1"
    exercise_type: str = "multiple_choice"
    quantity: int = 5


class ContentGenerationRequest(BaseModel):
    topic: str
    content_type: str  # lesson_plan, quiz, slides_outline, email
    level: str = "B1"
    additional_instructions: str = ""


class RecommendationRequest(BaseModel):
    student_id: int


# ─── Tutor IA (Chatbot) ───────────────────────────────────

@router.post("/chat")
async def chat_with_tutor(
    body: ChatMessage,
    user_id: int = Depends(get_current_user_id),
):
    """
    Chatbot de dúvidas de inglês — disponível 24/7.
    Responde dúvidas de gramática, vocabulário e uso.
    """
    from anthropic import Anthropic

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    system_prompt = """You are an expert English teacher assistant for Brazilian students.
    Your name is "Lily" and you work alongside the teacher to help students 24/7.

    Guidelines:
    - Answer questions about English grammar, vocabulary, pronunciation, and usage
    - Explain concepts clearly with examples
    - Use Portuguese when needed to clarify, but encourage English practice
    - Be encouraging and patient
    - Never replace the teacher — always suggest scheduling a lesson for complex topics
    - Keep responses concise and practical
    """

    messages = body.conversation_history + [
        {"role": "user", "content": body.message}
    ]

    response = client.messages.create(
        model=settings.AI_MODEL,
        max_tokens=1024,
        system=system_prompt,
        messages=messages,
    )

    return {
        "response": response.content[0].text,
        "tokens_used": response.usage.input_tokens + response.usage.output_tokens,
    }


# ─── Correção de Redação ──────────────────────────────────

@router.post("/correct-essay")
async def correct_essay(
    body: EssayRequest,
    user_id: int = Depends(get_current_user_id),
):
    """
    Correção detalhada de redação em inglês.
    Retorna feedback estruturado: erros, sugestões e nota.
    """
    from anthropic import Anthropic

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    prompt = f"""Please correct the following English text written by a {body.level} level student.
    Focus: {body.focus}

    Text to correct:
    ---
    {body.text}
    ---

    Provide your feedback in the following JSON structure:
    {{
        "overall_score": <0-100>,
        "corrected_text": "<the corrected version>",
        "summary": "<brief summary in Portuguese>",
        "errors": [
            {{
                "original": "<the error>",
                "correction": "<the fix>",
                "explanation": "<why it's wrong, in Portuguese>",
                "category": "grammar|vocabulary|punctuation|style"
            }}
        ],
        "positive_points": ["<what was good>"],
        "suggestions": ["<tips for improvement in Portuguese>"],
        "grade": "A|B|C|D|F"
    }}"""

    response = client.messages.create(
        model=settings.AI_MODEL,
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    import json
    try:
        feedback = json.loads(response.content[0].text)
    except json.JSONDecodeError:
        feedback = {"raw_feedback": response.content[0].text}

    return feedback


# ─── Geração de Exercícios ────────────────────────────────

@router.post("/generate-exercises")
async def generate_exercises(
    body: ExerciseGenerationRequest,
    user_id: int = Depends(get_current_user_id),
):
    """
    Gera exercícios personalizados por nível e tópico.
    Para uso da professora ou geração automática para o aluno.
    """
    from anthropic import Anthropic

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    prompt = f"""Create {body.quantity} {body.exercise_type} English exercises about "{body.topic}"
    for {body.level} level students.

    Return as JSON array:
    [
        {{
            "question": "<the question>",
            "options": ["A) ...", "B) ...", "C) ...", "D) ..."],  // for multiple choice
            "correct_answer": "A",
            "explanation": "<why this is correct, in Portuguese>",
            "difficulty": "easy|medium|hard"
        }}
    ]"""

    response = client.messages.create(
        model=settings.AI_MODEL,
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    import json
    try:
        exercises = json.loads(response.content[0].text)
    except json.JSONDecodeError:
        exercises = {"raw": response.content[0].text}

    return {"exercises": exercises, "topic": body.topic, "level": body.level}


# ─── Gerador de Conteúdo (para professora) ────────────────

@router.post("/generate-content")
async def generate_content(
    body: ContentGenerationRequest,
    user_id: int = Depends(get_current_user_id),
):
    """
    Ajuda a professora a criar materiais, planos de aula, quizzes.
    """
    from anthropic import Anthropic

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    content_templates = {
        "lesson_plan": "Create a detailed lesson plan",
        "quiz": "Create a quiz with 10 questions",
        "slides_outline": "Create a slide deck outline",
        "email": "Write an email template for students",
    }

    action = content_templates.get(body.content_type, "Create content")

    prompt = f"""{action} about "{body.topic}" for {body.level} level English students.
    Additional instructions: {body.additional_instructions}

    Format the response in a clear, structured way that's easy to use."""

    response = client.messages.create(
        model=settings.AI_MODEL,
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )

    return {
        "content": response.content[0].text,
        "content_type": body.content_type,
        "topic": body.topic,
    }


# ─── Análise de Pronúncia ─────────────────────────────────

@router.post("/analyze-pronunciation")
async def analyze_pronunciation(
    audio: UploadFile = File(...),
    target_text: str = "",
    user_id: int = Depends(get_current_user_id),
):
    """
    Aluno envia áudio → IA transcreve e analisa pronúncia.
    """
    import openai

    client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

    # Transcrição com Whisper
    audio_content = await audio.read()
    transcription = client.audio.transcriptions.create(
        model="whisper-1",
        file=(audio.filename, audio_content, audio.content_type),
        response_format="verbose_json",
    )

    transcribed_text = transcription.text

    # Análise de pronúncia com Claude
    from anthropic import Anthropic
    claude = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    analysis_prompt = f"""Analyze the pronunciation quality based on this transcription.
    Target text (what the student should have said): "{target_text}"
    What was actually transcribed: "{transcribed_text}"

    Provide feedback in JSON:
    {{
        "score": <0-100>,
        "transcribed": "{transcribed_text}",
        "accuracy": <0-100>,
        "feedback_pt": "<feedback in Portuguese>",
        "words_to_practice": ["<word1>", "<word2>"],
        "tips": ["<tip1 in Portuguese>"]
    }}"""

    response = claude.messages.create(
        model=settings.AI_MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": analysis_prompt}],
    )

    import json
    try:
        result = json.loads(response.content[0].text)
    except json.JSONDecodeError:
        result = {"transcribed": transcribed_text, "feedback": response.content[0].text}

    return result


# ─── Recomendação de Conteúdo ─────────────────────────────

@router.get("/recommendations/{student_id}")
async def get_recommendations(
    student_id: int,
    user_id: int = Depends(get_current_user_id),
):
    """
    Recomenda próximos materiais e exercícios com base no progresso do aluno.
    """
    # TODO: buscar dados reais do aluno do banco
    # Por ora, retorna estrutura de exemplo
    return {
        "student_id": student_id,
        "next_materials": [],
        "next_exercises": [],
        "focus_areas": [],
        "ai_message": "Continue praticando! 🎯",
    }


# ─── Simulador de Conversação ─────────────────────────────

@router.post("/conversation-simulator")
async def conversation_simulator(
    body: ChatMessage,
    scenario: str = "daily_conversation",
    level: str = "B1",
    user_id: int = Depends(get_current_user_id),
):
    """
    Aluno pratica inglês conversando com IA antes da aula real.
    """
    from anthropic import Anthropic

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    scenarios = {
        "daily_conversation": "a friendly daily conversation",
        "job_interview": "a job interview in English",
        "travel": "a travel situation (airport, hotel, restaurant)",
        "business": "a business meeting",
        "shopping": "a shopping experience",
    }

    scene = scenarios.get(scenario, "a general English conversation")

    system = f"""You are a conversation practice partner for a {level} level English student.
    Scenario: {scene}

    Rules:
    - Speak only in English
    - Adapt to the student's level ({level})
    - Gently correct mistakes when they occur (in parentheses)
    - Keep the conversation natural and engaging
    - If the student writes in Portuguese, respond in English and encourage them
    - Provide a brief feedback at the end of each response about their language use
    """

    messages = body.conversation_history + [
        {"role": "user", "content": body.message}
    ]

    response = client.messages.create(
        model=settings.AI_MODEL,
        max_tokens=512,
        system=system,
        messages=messages,
    )

    return {"response": response.content[0].text, "scenario": scenario}
