#!/usr/bin/env python3
"""
Schema-Mapper-to-Churn Agent (Backward Compatible Interface)

This file serves as a backward-compatible interface that orchestrates
the specialized Schema Mapper Agent and Churn Analysis Agent.

The original functionality is preserved while benefiting from the separation
of concerns provided by the specialized agents.

Version: 3.0.0 (Refactored with Specialized Agents)
"""

# Import the orchestrator and expose it as SchemaMapperAgent for backward compatibility
from .schema_churn_orchestrator import SchemaChurnOrchestrator

# Create alias for backward compatibility
SchemaMapperAgent = SchemaChurnOrchestrator
