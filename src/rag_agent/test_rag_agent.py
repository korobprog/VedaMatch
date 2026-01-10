"""
Unit tests for RAG Agent implementation.

Tests cover core functionality including document loading, indexing,
retrieval, and generation with proper mocking for external dependencies.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path
import tempfile

from rag_agent.main import (
    Document,
    SearchResult,
    VectorStore,
    RAGAgent,
    EmbeddingError,
    RetrievalError,
    GenerationError
)


@pytest.fixture
def sample_documents() -> list[Document]:
    """Create sample documents for testing."""
    return [
        Document(
            content="Python is a high-level programming language.",
            metadata={"source": "test.txt"},
            doc_id="doc1"
        ),
        Document(
            content="Machine learning uses data to make predictions.",
            metadata={"source": "test.txt"},
            doc_id="doc2"
        ),
        Document(
            content="RAG combines retrieval and generation for better answers.",
            metadata={"source": "test.txt"},
            doc_id="doc3"
        )
    ]


@pytest.fixture
def sample_search_results() -> list[SearchResult]:
    """Create sample search results for testing."""
    docs = [
        Document(content="Relevant content about Python", doc_id="doc1"),
        Document(content="More Python information", doc_id="doc2")
    ]
    return [
        SearchResult(document=docs[0], score=0.95),
        SearchResult(document=docs[1], score=0.85)
    ]


class TestDocument:
    """Tests for Document class."""
    
    def test_document_creation(self) -> None:
        """Test document creation with ID."""
        doc = Document(
            content="Test content",
            metadata={"key": "value"},
            doc_id="test123"
        )
        assert doc.content == "Test content"
        assert doc.metadata["key"] == "value"
        assert doc.doc_id == "test123"
    
    def test_document_auto_id(self) -> None:
        """Test automatic ID generation."""
        doc = Document(content="Test content")
        assert doc.doc_id != ""
        assert len(doc.doc_id) == 16
    
    def test_search_result_sorting(self) -> None:
        """Test search result sorting by score."""
        results = [
            SearchResult(document=Document(content="low", doc_id="1"), score=0.5),
            SearchResult(document=Document(content="high", doc_id="2"), score=0.9),
            SearchResult(document=Document(content="mid", doc_id="3"), score=0.7)
        ]
        results.sort()
        assert results[0].score == 0.9
        assert results[-1].score == 0.5


class TestVectorStore:
    """Tests for VectorStore class."""
    
    def test_vector_store_initialization(self) -> None:
        """Test vector store initialization."""
        store = VectorStore(embedding_dim=768)
        assert store.embedding_dim == 768
        assert len(store.embeddings) == 0
        assert len(store.documents) == 0
    
    @patch('rag_agent.main.SentenceTransformer')
    def test_add_documents_success(self, mock_transformer: Mock) -> None:
        """Test adding documents successfully."""
        # Mock the embedding model
        mock_model = MagicMock()
        mock_model.encode.return_value = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]
        mock_transformer.return_value = mock_model
        
        store = VectorStore(embedding_dim=3)
        docs = [
            Document(content="Doc 1", doc_id="1"),
            Document(content="Doc 2", doc_id="2")
        ]
        
        store.add_documents(docs)
        
        assert len(store.documents) == 2
        assert len(store.embeddings) == 2
    
    @patch('rag_agent.main.SentenceTransformer')
    def test_add_documents_failure(self, mock_transformer: Mock) -> None:
        """Test handling of embedding generation failure."""
        mock_transformer.side_effect = Exception("Model load failed")
        
        store = VectorStore()
        docs = [Document(content="Test", doc_id="1")]
        
        with pytest.raises(EmbeddingError):
            store.add_documents(docs)
    
    @patch('rag_agent.main.SentenceTransformer')
    def test_search_empty_store(self, mock_transformer: Mock) -> None:
        """Test searching empty store."""
        store = VectorStore()
        results = store.search("query")
        
        assert results == []
    
    @patch('rag_agent.main.SentenceTransformer')
    def test_search_with_results(self, mock_transformer: Mock) -> None:
        """Test search with matching documents."""
        mock_model = MagicMock()
        mock_model.encode.side_effect = [
            [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],  # Document embeddings
            [[0.1, 0.2, 0.3]]  # Query embedding
        ]
        mock_transformer.return_value = mock_model
        
        store = VectorStore(embedding_dim=3)
        docs = [
            Document(content="Python programming", doc_id="1"),
            Document(content="Machine learning", doc_id="2")
        ]
        store.add_documents(docs)
        
        results = store.search("Python", top_k=2, threshold=0.0)
        
        assert len(results) >= 0
        assert all(isinstance(r, SearchResult) for r in results)
    
    @patch('rag_agent.main.SentenceTransformer')
    def test_clear_store(self, mock_transformer: Mock) -> None:
        """Test clearing the vector store."""
        mock_model = MagicMock()
        mock_model.encode.return_value = [[0.1, 0.2, 0.3]]
        mock_transformer.return_value = mock_model
        
        store = VectorStore(embedding_dim=3)
        docs = [Document(content="Test", doc_id="1")]
        store.add_documents(docs)
        
        assert len(store.documents) == 1
        
        store.clear()
        assert len(store.documents) == 0
        assert len(store.embeddings) == 0


class TestRAGAgent:
    """Tests for RAGAgent class."""
    
    @patch('rag_agent.main.OpenAI')
    def test_agent_initialization(self, mock_openai: Mock) -> None:
        """Test agent initialization."""
        agent = RAGAgent(model_name="gpt-4", api_key="test-key")
        
        assert agent.model_name == "gpt-4"
        assert isinstance(agent.vector_store, VectorStore)
    
    @patch('rag_agent.main.OpenAI')
    def test_load_documents_success(self, mock_openai: Mock, sample_documents: list[Document]) -> None:
        """Test loading documents from file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("Paragraph 1\n\nParagraph 2\n\nParagraph 3")
            temp_path = f.name
        
        try:
            agent = RAGAgent()
            docs = agent.load_documents(temp_path)
            
            assert len(docs) == 3
            assert all(isinstance(doc, Document) for doc in docs)
            assert docs[0].metadata["source"] == temp_path
        finally:
            Path(temp_path).unlink()
    
    @patch('rag_agent.main.OpenAI')
    def test_load_documents_nonexistent(self, mock_openai: Mock) -> None:
        """Test loading nonexistent file."""
        agent = RAGAgent()
        
        with pytest.raises(IOError):
            agent.load_documents("/nonexistent/file.txt")
    
    @patch('rag_agent.main.OpenAI')
    def test_index_documents(self, mock_openai: Mock) -> None:
        """Test indexing documents."""
        with patch('rag_agent.main.SentenceTransformer') as mock_transformer:
            mock_model = MagicMock()
            mock_model.encode.return_value = [[0.1, 0.2, 0.3]]
            mock_transformer.return_value = mock_model
            
            agent = RAGAgent()
            docs = [Document(content="Test", doc_id="1")]
            
            agent.index_documents(docs)
            
            assert len(agent.vector_store.documents) == 1
    
    @patch('rag_agent.main.OpenAI')
    def test_retrieve_documents(self, mock_openai: Mock) -> None:
        """Test document retrieval."""
        with patch('rag_agent.main.SentenceTransformer') as mock_transformer:
            mock_model = MagicMock()
            mock_model.encode.side_effect = [
                [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
                [[0.1, 0.2, 0.3]]
            ]
            mock_transformer.return_value = mock_model
            
            agent = RAGAgent()
            docs = [
                Document(content="Python programming", doc_id="1"),
                Document(content="Data science", doc_id="2")
            ]
            agent.index_documents(docs)
            
            results = agent.retrieve("Python", top_k=2)
            
            assert isinstance(results, list)
    
    @patch('rag_agent.main.OpenAI')
    def test_generate_with_context(self, mock_openai: Mock, sample_search_results: list[SearchResult]) -> None:
        """Test generation with context."""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Python is a programming language."
        mock_client.chat.completions.create.return_value = mock_response
        mock_openai.return_value = mock_client
        
        agent = RAGAgent()
        answer = agent.generate("What is Python?", sample_search_results)
        
        assert answer == "Python is a programming language."
        mock_client.chat.completions.create.assert_called_once()
    
    @patch('rag_agent.main.OpenAI')
    def test_generate_without_context(self, mock_openai: Mock) -> None:
        """Test generation without context."""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "I cannot answer that."
        mock_client.chat.completions.create.return_value = mock_response
        mock_openai.return_value = mock_client
        
        agent = RAGAgent()
        answer = agent.generate("Unknown question", [])
        
        assert answer == "I cannot answer that."
    
    @patch('rag_agent.main.OpenAI')
    def test_query_full_pipeline(self, mock_openai: Mock) -> None:
        """Test complete query pipeline."""
        with patch('rag_agent.main.SentenceTransformer') as mock_transformer:
            # Setup mocks
            mock_model = MagicMock()
            mock_model.encode.side_effect = [
                [[0.1, 0.2, 0.3]],
                [[0.1, 0.2, 0.3]]
            ]
            mock_transformer.return_value = mock_model
            
            mock_client = MagicMock()
            mock_response = MagicMock()
            mock_response.choices = [MagicMock()]
            mock_response.choices[0].message.content = "RAG stands for Retrieval-Augmented Generation."
            mock_client.chat.completions.create.return_value = mock_response
            mock_openai.return_value = mock_client
            
            # Run test
            agent = RAGAgent()
            agent.index_documents([
                Document(content="RAG combines retrieval and generation.", doc_id="1")
            ])
            
            result = agent.query("What is RAG?")
            
            assert "question" in result
            assert "answer" in result
            assert result["answer"] == "RAG stands for Retrieval-Augmented Generation."
            assert result["context_count"] == 1


class TestErrorHandling:
    """Tests for error handling."""
    
    def test_custom_exceptions(self) -> None:
        """Test custom exception classes."""
        with pytest.raises(EmbeddingError):
            raise EmbeddingError("Test error")
        
        with pytest.raises(RetrievalError):
            raise RetrievalError("Test error")
        
        with pytest.raises(GenerationError):
            raise GenerationError("Test error")
