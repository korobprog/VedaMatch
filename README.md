# RAG Agent

A modern Retrieval-Augmented Generation (RAG) system built with Python 3.12+, featuring document indexing, semantic search, and LLM-powered response generation.

## Features

- **Semantic Document Indexing**: Advanced embedding-based document storage and retrieval
- **Intelligent Retrieval**: Cosine similarity search with configurable thresholds
- **RAG Pipeline**: Seamless integration of retrieval and generation
- **Type Hints**: Full type annotation throughout the codebase
- **Error Handling**: Comprehensive custom exceptions
- **Logging**: Detailed logging for debugging and monitoring
- **Testing**: Extensive unit tests with pytest

## Requirements

- Python 3.12 or higher
- OpenAI API key

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd Rag-agent
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set your OpenAI API key:
   ```bash
   export OPENAI_API_KEY=your-api-key-here
   ```

## Quick Start

```python
from rag_agent.main import RAGAgent, Document

# Initialize the agent
agent = RAGAgent(model_name="gpt-3.5-turbo")

# Create and index documents
documents = [
    Document(content="Python is a high-level programming language."),
    Document(content="Machine learning enables systems to learn from data."),
    Document(content="RAG combines retrieval with generation for better responses."),
]
agent.index_documents(documents)

# Query the system
result = agent.query("What is RAG?")
print(f"Answer: {result['answer']}")
```

## Usage

### Loading Documents from Files

```python
# Load documents from a text file
documents = agent.load_documents("path/to/document.txt")
agent.index_documents(documents)
```

### Configuring Retrieval

```python
# Retrieve with custom parameters
context = agent.retrieve(
    query="your question",
    top_k=5,
    threshold=0.6
)
```

### Generating Responses

```python
# Generate with custom parameters
answer = agent.generate(
    query="your question",
    context=context,
    max_tokens=500,
    temperature=0.7
)
```

## Architecture

### Core Components

- **Document**: Dataclass representing document chunks with metadata
- **VectorStore**: In-memory vector store for embeddings and similarity search
- **RAGAgent**: Main orchestrator for indexing, retrieval, and generation

### Key Classes

#### Document
Represents a document chunk with content and metadata. Automatically generates unique IDs.

#### VectorStore
Manages document embeddings using SentenceTransformers. Supports:
- Adding documents with automatic embedding generation
- Semantic search with cosine similarity
- Configurable similarity thresholds

#### RAGAgent
Complete RAG pipeline implementation:
- Document loading and chunking
- Semantic indexing
- Context retrieval
- LLM-powered generation

## Testing

Run the test suite:

```bash
pytest src/rag_agent/test_rag_agent.py -v
```

Run with coverage:

```bash
pytest src/rag_agent/test_rag_agent.py --cov=rag_agent --cov-report=html
```

## Configuration

### Vector Store Configuration

```python
agent = RAGAgent(
    model_name="gpt-4",
    embedding_dim=768,  # Dimension of embeddings
    api_key="your-api-key"
)
```

### Retrieval Parameters

- `top_k`: Number of documents to retrieve (default: 3)
- `threshold`: Minimum similarity score (default: 0.5)

### Generation Parameters

- `max_tokens`: Maximum tokens in response (default: 500)
- `temperature`: Generation randomness (default: 0.7)

## Error Handling

The system includes custom exceptions for different error scenarios:

- `EmbeddingError`: Errors during embedding generation
- `RetrievalError`: Errors during document retrieval
- `GenerationError`: Errors during response generation

Example:

```python
try:
    result = agent.query("your question")
except GenerationError as e:
    logger.error(f"Generation failed: {e}")
```

## Logging

Configure logging:

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

## Project Structure

```
Rag-agent/
├── src/
│   └── rag_agent/
│       ├── main.py              # Main RAG implementation
│       └── test_rag_agent.py    # Unit tests
├── requirements.txt             # Python dependencies
├── pyproject.toml              # Modern packaging configuration
├── README.md                   # This file
└── .gitignore                  # Git ignore rules
```

## Dependencies

- `numpy>=1.24.0`: Numerical computing
- `openai>=1.3.0`: OpenAI API client
- `sentence-transformers>=2.2.0`: Text embeddings
- `pytest>=7.4.0`: Testing framework
- `pytest-cov>=4.1.0`: Coverage plugin
- `python-dotenv>=1.0.0`: Environment variable management

## Contributing

Contributions are welcome! Please ensure:
- All tests pass
- Code follows type hints
- New features include tests
- Documentation is updated

## License

[Your License Here]

## Support

For issues and questions, please open an issue on the repository.
