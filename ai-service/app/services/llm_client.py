"""
LLM Client Abstraction Layer
Supports multiple providers: OpenAI, Groq, Anthropic
Easily swappable backend
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from functools import lru_cache
import json

from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings

settings = get_settings()


@dataclass
class LLMResponse:
    """Standard response from LLM"""
    content: str
    model: str
    usage: Dict[str, int]
    finish_reason: str


@dataclass
class Message:
    """Chat message"""
    role: str  # system, user, assistant
    content: str


class BaseLLMProvider(ABC):
    """Abstract base class for LLM providers"""
    
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        history: Optional[List[Message]] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_mode: bool = False
    ) -> LLMResponse:
        """Generate a response from the LLM"""
        pass


class OpenAIProvider(BaseLLMProvider):
    """OpenAI GPT provider"""
    
    def __init__(self):
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        history: Optional[List[Message]] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_mode: bool = False
    ) -> LLMResponse:
        messages = []
        
        # Add system prompt
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        # Add history
        if history:
            for msg in history:
                messages.append({"role": msg.role, "content": msg.content})
        
        # Add current prompt
        messages.append({"role": "user", "content": prompt})
        
        # Build request kwargs
        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature or settings.LLM_TEMPERATURE,
            "max_tokens": max_tokens or settings.LLM_MAX_TOKENS,
        }
        
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        
        response = await self.client.chat.completions.create(**kwargs)
        
        return LLMResponse(
            content=response.choices[0].message.content,
            model=response.model,
            usage={
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            },
            finish_reason=response.choices[0].finish_reason
        )


class GroqProvider(BaseLLMProvider):
    """Groq LLM provider (fast inference)"""
    
    def __init__(self):
        from groq import AsyncGroq
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        self.model = settings.GROQ_MODEL
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        history: Optional[List[Message]] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_mode: bool = False
    ) -> LLMResponse:
        messages = []
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        if history:
            for msg in history:
                messages.append({"role": msg.role, "content": msg.content})
        
        messages.append({"role": "user", "content": prompt})
        
        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature or settings.LLM_TEMPERATURE,
            "max_tokens": max_tokens or settings.LLM_MAX_TOKENS,
        }
        
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        
        response = await self.client.chat.completions.create(**kwargs)
        
        return LLMResponse(
            content=response.choices[0].message.content,
            model=response.model,
            usage={
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            },
            finish_reason=response.choices[0].finish_reason
        )


class AnthropicProvider(BaseLLMProvider):
    """Anthropic Claude provider"""
    
    def __init__(self):
        from anthropic import AsyncAnthropic
        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.ANTHROPIC_MODEL
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        history: Optional[List[Message]] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_mode: bool = False
    ) -> LLMResponse:
        messages = []
        
        if history:
            for msg in history:
                messages.append({"role": msg.role, "content": msg.content})
        
        messages.append({"role": "user", "content": prompt})
        
        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature or settings.LLM_TEMPERATURE,
            "max_tokens": max_tokens or settings.LLM_MAX_TOKENS,
        }
        
        if system_prompt:
            kwargs["system"] = system_prompt
        
        response = await self.client.messages.create(**kwargs)
        
        return LLMResponse(
            content=response.content[0].text,
            model=response.model,
            usage={
                "prompt_tokens": response.usage.input_tokens,
                "completion_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.input_tokens + response.usage.output_tokens
            },
            finish_reason=response.stop_reason
        )


class LLMClient:
    """
    Main LLM client that abstracts provider selection
    Usage:
        client = LLMClient()
        response = await client.generate(prompt, system_prompt, history)
    """
    
    def __init__(self, provider: Optional[str] = None):
        provider = provider or settings.LLM_PROVIDER
        self.provider = self._get_provider(provider)
        self.provider_name = provider
    
    def _get_provider(self, provider: str) -> BaseLLMProvider:
        """Get the appropriate provider instance"""
        providers = {
            "openai": OpenAIProvider,
            "groq": GroqProvider,
            "anthropic": AnthropicProvider,
        }
        
        if provider not in providers:
            raise ValueError(f"Unknown LLM provider: {provider}. Available: {list(providers.keys())}")
        
        return providers[provider]()
    
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_mode: bool = False
    ) -> LLMResponse:
        """
        Generate a response from the LLM
        
        Args:
            prompt: The user's input prompt
            system_prompt: Optional system instruction
            history: Optional conversation history as list of {"role": "...", "content": "..."}
            temperature: Optional temperature override
            max_tokens: Optional max tokens override
            json_mode: If True, request JSON formatted response
            
        Returns:
            LLMResponse with content, model, usage stats, and finish reason
        """
        # Convert history dicts to Message objects
        message_history = None
        if history:
            message_history = [Message(role=m["role"], content=m["content"]) for m in history]
        
        return await self.provider.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            history=message_history,
            temperature=temperature,
            max_tokens=max_tokens,
            json_mode=json_mode
        )
    
    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """Generate a JSON response and parse it"""
        response = await self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            history=history,
            json_mode=True
        )
        return json.loads(response.content)


@lru_cache()
def get_llm_client() -> LLMClient:
    """Get cached LLM client instance"""
    return LLMClient()

