"""Base repository pattern for data access."""

import logging
from typing import Any, Dict, List, Optional, TypeVar, Generic
from abc import ABC, abstractmethod

from data.connection import db_connection

logger = logging.getLogger(__name__)

T = TypeVar('T')


class BaseRepository(ABC, Generic[T]):
    """Base repository with common database operations."""
    
    def __init__(self, table_name: str):
        self.table_name = table_name
        self.db = db_connection
    
    @abstractmethod
    def _entity_from_row(self, row: Dict[str, Any]) -> T:
        """Convert a database row to an entity."""
        pass
    
    @abstractmethod
    def _entity_to_dict(self, entity: T) -> Dict[str, Any]:
        """Convert an entity to a dictionary for database operations."""
        pass
    
    def find_all(self, limit: int = None, offset: int = 0) -> List[T]:
        """Find all entities with optional pagination."""
        query = f"SELECT * FROM {self.table_name}"
        if limit:
            query += f" LIMIT {limit} OFFSET {offset}"
        
        rows = self.db.execute_query(query)
        return [self._entity_from_row(row) for row in rows] if rows else []
    
    def find_by_id(self, entity_id: int) -> Optional[T]:
        """Find an entity by ID."""
        query = f"SELECT * FROM {self.table_name} WHERE id = %s"
        rows = self.db.execute_query(query, (entity_id,))
        return self._entity_from_row(rows[0]) if rows else None
    
    def find_by_field(self, field: str, value: Any) -> List[T]:
        """Find entities by a specific field value."""
        query = f"SELECT * FROM {self.table_name} WHERE {field} = %s"
        rows = self.db.execute_query(query, (value,))
        return [self._entity_from_row(row) for row in rows] if rows else []
    
    def create(self, entity: T) -> T:
        """Create a new entity."""
        data = self._entity_to_dict(entity)
        
        # Remove id field if present
        data.pop('id', None)
        
        columns = ', '.join(data.keys())
        placeholders = ', '.join(['%s'] * len(data))
        query = f"""
            INSERT INTO {self.table_name} ({columns})
            VALUES ({placeholders})
            RETURNING *
        """
        
        rows = self.db.execute_query(query, tuple(data.values()))
        return self._entity_from_row(rows[0]) if rows else entity
    
    def update(self, entity_id: int, entity: T) -> Optional[T]:
        """Update an existing entity."""
        data = self._entity_to_dict(entity)
        
        # Remove id field
        data.pop('id', None)
        
        set_clause = ', '.join([f"{k} = %s" for k in data.keys()])
        query = f"""
            UPDATE {self.table_name}
            SET {set_clause}
            WHERE id = %s
            RETURNING *
        """
        
        params = list(data.values()) + [entity_id]
        rows = self.db.execute_query(query, tuple(params))
        return self._entity_from_row(rows[0]) if rows else None
    
    def delete(self, entity_id: int) -> bool:
        """Delete an entity by ID."""
        query = f"DELETE FROM {self.table_name} WHERE id = %s"
        self.db.execute_query(query, (entity_id,))
        return True
    
    def count(self) -> int:
        """Count total entities."""
        query = f"SELECT COUNT(*) as count FROM {self.table_name}"
        rows = self.db.execute_query(query)
        return rows[0]['count'] if rows else 0
    
    def execute_custom_query(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Execute a custom query."""
        return self.db.execute_query(query, params)