"""
RAG Agent - Retrieval Augmented Generation Implementation

This module provides a complete RAG system for document indexing, retrieval,
and augmented generation using modern Python features.
"""

import logging
from typing import List, Optional, Any
from dataclasses import dataclass, field
from pathlib import Path
import hashlib
import json

import numpy as np
from openai import OpenAI
from sentence_transformers import SentenceTransformer


logger = logging.getLogger(__name__)


@dataclass
class Document:
    """Represents a document chunk with metadata."""
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)
    doc_id: str = ""
    
    def __post_init__(self) -> None:
        """Generate document ID if not provided."""
        if not self.doc_id:
            self.doc_id = hashlib.md5(self.content.encode()).hexdigest()[:16]


@dataclass
class SearchResult:
    """Represents a search result with relevance score."""
    document: Document
    score: float
    
    def __lt__(self, other: "SearchResult") -> bool:
        """Enable sorting by score."""
        return self.score > other.score


class EmbeddingError(Exception):
    """Exception raised for embedding generation errors."""
    pass


class RetrievalError(Exception):
    """Exception raised for retrieval errors."""
    pass


class GenerationError(Exception):
    """Exception raised for generation errors."""
    pass


class VectorStore:
    """Simple in-memory vector store for document embeddings."""
    
    def __init__(self, embedding_dim: int = 384) -> None:
        """
        Initialize vector store.
        
        Args:
            embedding_dim: Dimension of embeddings
        """
        self.embedding_dim: int = embedding_dim
        self.embeddings: list[np.ndarray] = []
        self.documents: list[Document] = []
        self._embedding_model: Optional[SentenceTransformer] = None
        
    @property
    def embedding_model(self) -> SentenceTransformer:
        """Lazy load embedding model."""
        if self._embedding_model is None:
            try:
                self._embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
                logger.info("Embedding model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load embedding model: {e}")
                raise EmbeddingError(f"Failed to load embedding model: {e}")
        return self._embedding_model
    
    def add_documents(self, documents: List[Document]) -> None:
        """
        Add documents to the vector store.
        
        Args:
            documents: List of documents to add
            
        Raises:
            EmbeddingError: If embedding generation fails
        """
        try:
            texts = [doc.content for doc in documents]
            embeddings = self.embedding_model.encode(
                texts, 
                convert_to_numpy=True,
                show_progress_bar=False
            )
            
            for doc, embedding in zip(documents, embeddings):
                self.documents.append(doc)
                self.embeddings.append(embedding)
                
            logger.info(f"Added {len(documents)} documents to vector store")
        except Exception as e:
            logger.error(f"Failed to add documents: {e}")
            raise EmbeddingError(f"Failed to generate embeddings: {e}")
    
    def search(
        self, 
        query: str, 
        top_k: int = 5, 
        threshold: float = 0.5
    ) -> List[SearchResult]:
        """
        Search for relevant documents.
        
        Args:
            query: Search query
            top_k: Number of results to return
            threshold: Minimum similarity threshold
            
        Returns:
            List of search results sorted by relevance
            
        Raises:
            RetrievalError: If search fails
        """
        if not self.embeddings:
            logger.warning("Vector store is empty")
            return []
        
        try:
            query_embedding = self.embedding_model.encode(
                [query], 
                convert_to_numpy=True
            )[0]
            
            # Calculate cosine similarity
            similarities = [
                float(np.dot(query_embedding, emb) / 
                      (np.linalg.norm(query_embedding) * np.linalg.norm(emb) + 1e-8))
                for emb in self.embeddings
            ]
            
            # Filter by threshold and sort
            results = [
                SearchResult(document=self.documents[i], score=sim)
                for i, sim in enumerate(similarities)
                if sim >= threshold
            ]
            results.sort()
            
            logger.info(f"Found {len(results)} results for query: {query[:50]}...")
            return results[:top_k]
        except Exception as e:
            logger.error(f"Search failed: {e}")
            raise RetrievalError(f"Search failed: {e}")
    
    def clear(self) -> None:
        """Clear all documents from the store."""
        self.documents.clear()
        self.embeddings.clear()
        logger.info("Vector store cleared")


class RAGAgent:
    """Main RAG Agent class for indexing and retrieval-augmented generation."""
    
    def __init__(
        self, 
        model_name: str = "gpt-3.5-turbo",
        embedding_dim: int = 384,
        api_key: Optional[str] = None
    ) -> None:
        """
        Initialize RAG Agent.
        
        Args:
            model_name: Name of the LLM model to use
            embedding_dim: Dimension of embeddings
            api_key: OpenAI API key (uses OPENAI_API_KEY env var if not provided)
        """
        self.vector_store: VectorStore = VectorStore(embedding_dim)
        self.model_name: str = model_name
        
        try:
            self.client: OpenAI = OpenAI(api_key=api_key)
            logger.info(f"RAG Agent initialized with model: {model_name}")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
            raise GenerationError(f"Failed to initialize OpenAI client: {e}")
    
    def load_documents(self, file_path: str) -> List[Document]:
        """
        Load documents from a file.
        
        Args:
            file_path: Path to the document file
            
        Returns:
            List of documents
            
        Raises:
            IOError: If file cannot be read
        """
        try:
            path = Path(file_path)
            if not path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            
            content = path.read_text(encoding='utf-8')
            metadata = {"source": str(path), "size": len(content)}
            
            # Simple chunking by paragraphs
            chunks = []
            paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
            
            for i, paragraph in enumerate(paragraphs):
                doc = Document(
                    content=paragraph,
                    metadata={**metadata, "chunk_index": i},
                    doc_id=f"{path.name}_chunk_{i}"
                )
                chunks.append(doc)
            
            logger.info(f"Loaded {len(chunks)} document chunks from {file_path}")
            return chunks
        except Exception as e:
            logger.error(f"Failed to load documents: {e}")
            raise IOError(f"Failed to load documents: {e}")
    
    def index_documents(self, documents: List[Document]) -> None:
        """
        Index documents for retrieval.
        
        Args:
            documents: List of documents to index
        """
        logger.info(f"Indexing {len(documents)} documents...")
        self.vector_store.add_documents(documents)
    
    def retrieve(self, query: str, top_k: int = 3) -> List[SearchResult]:
        """
        Retrieve relevant documents for a query.
        
        Args:
            query: Search query
            top_k: Number of results to return
            
        Returns:
            List of search results
        """
        return self.vector_store.search(query, top_k=top_k)
    
    def generate(
        self, 
        query: str, 
        context: List[SearchResult],
        max_tokens: int = 500,
        temperature: float = 0.7
    ) -> str:
        """
        Generate response using retrieved context.
        
        Args:
            query: User query
            context: Retrieved search results
            max_tokens: Maximum tokens to generate
            temperature: Generation temperature
            
        Returns:
            Generated response
            
        Raises:
            GenerationError: If generation fails
        """
        if not context:
            logger.warning("No context provided for generation")
            prompt = f"Question: {query}\n\nAnswer the question to the best of your ability."
        else:
            context_text = "\n\n".join([
                f"[Relevance: {result.score:.2f}] {result.document.content}"
                for result in context
            ])
            prompt = (
                f"Context:\n{context_text}\n\n"
                f"Question: {query}\n\n"
                f"Answer the question using the provided context. "
                f"If the context doesn't contain relevant information, say so."
            )
        
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that answers questions based on provided context."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=temperature
            )
            
            answer = response.choices[0].message.content or ""
            logger.info(f"Generated response ({len(answer)} characters)")
            return answer
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            raise GenerationError(f"Generation failed: {e}")
    
    def query(
        self, 
        question: str, 
        top_k: int = 3,
        max_tokens: int = 500,
        temperature: float = 0.7
    ) -> dict[str, Any]:
        """
        Complete RAG pipeline: retrieve and generate.
        
        Args:
            question: User question
            top_k: Number of documents to retrieve
            max_tokens: Maximum tokens to generate
            temperature: Generation temperature
            
        Returns:
            Dictionary containing response and metadata
        """
        try:
            logger.info(f"Processing query: {question[:50]}...")
            
            context = self.retrieve(question, top_k=top_k)
            answer = self.generate(question, context, max_tokens, temperature)
            
            result = {
                "question": question,
                "answer": answer,
                "context_count": len(context),
                "context_scores": [r.score for r in context],
                "context_sources": [r.document.metadata.get("source", "unknown") for r in context]
            }
            
            logger.info("Query processed successfully")
            return result
        except Exception as e:
            logger.error(f"Query failed: {e}")
            raise


def main() -> None:
    """Example usage of the RAG Agent."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Initialize RAG Agent
    agent = RAGAgent(model_name="gpt-3.5-turbo")
    
    # Example: Create and index sample documents
    sample_docs = [
        Document(content="Python is a high-level programming language known for its simplicity and readability."),
        Document(content="Machine learning is a subset of artificial intelligence that enables systems to learn from data."),
        Document(content="Retrieval-Augmented Generation (RAG) combines retrieval systems with generative models for better responses."),
    ]
    
    # Index documents
    agent.index_documents(sample_docs)
    
    # Query
    try:
        result = agent.query("What is RAG?")
        print(f"\nQuestion: {result['question']}")
        print(f"Answer: {result['answer']}")
        print(f"Used {result['context_count']} context documents")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
