"""
Embedding Service for generating text embeddings
Uses OpenAI embeddings by default (works best with pgvector)
"""
from typing import List, Optional
from functools import lru_cache
import numpy as np

from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings

settings = get_settings()


class EmbeddingService:
    """
    Service for generating text embeddings
    Currently uses OpenAI's embedding API
    """
    
    def __init__(self):
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_EMBEDDING_MODEL
        self.dimension = settings.EMBEDDING_DIMENSION
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def embed(self, text: str) -> List[float]:
        """
        Generate embedding for a single text
        
        Args:
            text: Text to embed
            
        Returns:
            List of floats representing the embedding vector
        """
        # Clean and truncate text if needed
        text = text.replace("\n", " ").strip()
        if len(text) > 8000:  # Rough token limit
            text = text[:8000]
        
        response = await self.client.embeddings.create(
            model=self.model,
            input=text,
            encoding_format="float"
        )
        
        return response.data[0].embedding
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        # Clean texts
        cleaned_texts = [t.replace("\n", " ").strip()[:8000] for t in texts]
        
        response = await self.client.embeddings.create(
            model=self.model,
            input=cleaned_texts,
            encoding_format="float"
        )
        
        # Sort by index to maintain order
        sorted_data = sorted(response.data, key=lambda x: x.index)
        return [item.embedding for item in sorted_data]
    
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """
        Calculate cosine similarity between two vectors
        
        Args:
            vec1: First embedding vector
            vec2: Second embedding vector
            
        Returns:
            Similarity score between 0 and 1
        """
        a = np.array(vec1)
        b = np.array(vec2)
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


@lru_cache()
def get_embedding_service() -> EmbeddingService:
    """Get cached embedding service instance"""
    return EmbeddingService()

