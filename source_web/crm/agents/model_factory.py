"""
AI Model Factory - Centralized Model Initialization for CRM Agents

A centralized factory for initializing AI models (OpenAI, Google Gemini) used by all CRM agents.
This eliminates code duplication and provides a single point of configuration for model initialization.

Key Features:
1. Centralized model initialization for all AI providers
2. Consistent API key management from environment variables
3. Default model configuration with environment variable overrides
4. Comprehensive error handling and logging
5. Support for both OpenAI and Google Gemini providers
6. Reusable across all CRM agent classes

Supported Providers:
- Google Gemini (gemini-1.5-flash, gemini-1.5-pro)
- OpenAI (gpt-4, gpt-4-turbo, gpt-3.5-turbo)

Usage:
    from agents.model_factory import ModelFactory
    
    # Initialize factory
    factory = ModelFactory(provider="openai", model_name="gpt-4")
    
    # Get initialized model and client
    model_info = factory.get_model_info()
    client = model_info.client  # For OpenAI
    model = model_info.model    # For Gemini
"""

import google.generativeai as genai
import openai
import os
import logging
from typing import Optional, Union, NamedTuple
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class ModelInfo(NamedTuple):
    """Container for model initialization information"""
    provider: str
    model_name: str
    client: Optional[openai.OpenAI] = None
    model: Optional[genai.GenerativeModel] = None


class ModelFactory:
    """
    Centralized factory for AI model initialization
    
    This factory handles the initialization of AI models for all CRM agents,
    eliminating code duplication and providing consistent configuration.
    """
    
    # Default models for each provider
    DEFAULT_MODELS = {
        "gemini": "gemini-1.5-flash",
        "openai": "gpt-3.5-turbo"
    }
    
    # Supported providers
    SUPPORTED_PROVIDERS = {"gemini", "openai"}
    
    def __init__(self,
                 provider: str = "openai",
                 model_name: Optional[str] = None,
                 google_api_key: Optional[str] = None,
                 openai_api_key: Optional[str] = None,
                 agent_name: str = "Unknown Agent"):
        """
        Initialize the Model Factory
        
        Args:
            provider: AI provider to use ("gemini" or "openai")
            model_name: Specific model to use (if None, uses defaults)
            google_api_key: Google AI API key (if not provided, uses environment variable)
            openai_api_key: OpenAI API key (if not provided, uses environment variable)
            agent_name: Name of the agent using this factory (for logging)
        """
        self.provider = provider.lower()
        self.agent_name = agent_name
        
        # Validate provider
        if self.provider not in self.SUPPORTED_PROVIDERS:
            raise ValueError(f"Unsupported provider: {provider}. Use one of: {', '.join(self.SUPPORTED_PROVIDERS)}")
        
        # Set model name with defaults
        self.model_name = self._resolve_model_name(model_name)
        
        # Store API keys
        self.google_api_key = google_api_key
        self.openai_api_key = openai_api_key
        
        # Initialize the model
        self.model_info = self._initialize_model()
    
    def _resolve_model_name(self, model_name: Optional[str]) -> str:
        """
        Resolve the model name using defaults and environment variables
        
        Args:
            model_name: Provided model name or None
            
        Returns:
            Resolved model name
        """
        if model_name is not None:
            return model_name
        
        # Check environment variables first
        if self.provider == "gemini":
            return os.getenv("DEFAULT_GEMINI_MODEL", self.DEFAULT_MODELS["gemini"])
        elif self.provider == "openai":
            return os.getenv("DEFAULT_OPENAI_MODEL", self.DEFAULT_MODELS["openai"])
        
        # Fallback to hardcoded defaults
        return self.DEFAULT_MODELS.get(self.provider, "gpt-3.5-turbo")
    
    def _initialize_model(self) -> ModelInfo:
        """
        Initialize the AI model based on the provider
        
        Returns:
            ModelInfo containing the initialized model/client
        """
        if self.provider == "gemini":
            return self._init_gemini()
        elif self.provider == "openai":
            return self._init_openai()
        else:
            raise ValueError(f"Unsupported provider: {self.provider}")
    
    def _init_gemini(self) -> ModelInfo:
        """
        Initialize Google Gemini model
        
        Returns:
            ModelInfo with Gemini model
        """
        # Handle API key
        api_key = self.google_api_key
        if api_key:
            os.environ["GOOGLE_API_KEY"] = api_key
        elif not os.environ.get("GOOGLE_API_KEY"):
            raise ValueError(
                "Google AI API key must be provided either as parameter or GOOGLE_API_KEY environment variable"
            )
        
        # Configure and create model
        try:
            genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
            model = genai.GenerativeModel(self.model_name)
            
            logger.info(f"✅ Initialized {self.agent_name} with Gemini {self.model_name}")
            
            return ModelInfo(
                provider=self.provider,
                model_name=self.model_name,
                model=model
            )
            
        except Exception as e:
            logger.error(f"Failed to initialize Gemini model for {self.agent_name}: {str(e)}")
            raise ValueError(f"Failed to initialize Gemini model: {str(e)}")
    
    def _init_openai(self) -> ModelInfo:
        """
        Initialize OpenAI model
        
        Returns:
            ModelInfo with OpenAI client
        """
        # Handle API key
        api_key = self.openai_api_key
        if api_key:
            openai.api_key = api_key
        elif os.environ.get("OPENAI_API_KEY"):
            openai.api_key = os.environ["OPENAI_API_KEY"]
        else:
            raise ValueError(
                "OpenAI API key must be provided either as parameter or OPENAI_API_KEY environment variable"
            )
        
        # Create client
        try:
            client = openai.OpenAI(api_key=openai.api_key)
            
            logger.info(f"✅ Initialized {self.agent_name} with OpenAI {self.model_name}")
            
            return ModelInfo(
                provider=self.provider,
                model_name=self.model_name,
                client=client
            )
            
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client for {self.agent_name}: {str(e)}")
            raise ValueError(f"Failed to initialize OpenAI client: {str(e)}")
    
    def get_model_info(self) -> ModelInfo:
        """
        Get the initialized model information
        
        Returns:
            ModelInfo containing provider, model_name, and initialized client/model
        """
        return self.model_info
    
    def generate_content(self, prompt: str, system_message: Optional[str] = None) -> str:
        """
        Generate content using the initialized model
        
        Args:
            prompt: The user prompt
            system_message: Optional system message for better context
            
        Returns:
            Generated content string
        """
        if system_message is None:
            system_message = "You are a helpful AI assistant."
        
        try:
            if self.provider == "gemini":
                # For Gemini, include system message in the prompt
                full_prompt = f"System: {system_message}\n\nUser: {prompt}"
                response = self.model_info.model.generate_content(full_prompt)
                return response.text
                
            elif self.provider == "openai":
                response = self.model_info.client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=2500
                )
                return response.choices[0].message.content
                
        except Exception as e:
            logger.error(f"Error generating content with {self.provider} for {self.agent_name}: {str(e)}")
            return f"Error generating content with {self.provider}: {str(e)}"
    
    @classmethod
    def create_for_agent(cls,
                        agent_name: str,
                        provider: str = "openai",
                        model_name: Optional[str] = None,
                        google_api_key: Optional[str] = None,
                        openai_api_key: Optional[str] = None) -> 'ModelFactory':
        """
        Factory method to create a ModelFactory for a specific agent
        
        Args:
            agent_name: Name of the agent
            provider: AI provider to use
            model_name: Specific model to use
            google_api_key: Google AI API key
            openai_api_key: OpenAI API key
            
        Returns:
            Configured ModelFactory instance
        """
        return cls(
            provider=provider,
            model_name=model_name,
            google_api_key=google_api_key,
            openai_api_key=openai_api_key,
            agent_name=agent_name
        )
