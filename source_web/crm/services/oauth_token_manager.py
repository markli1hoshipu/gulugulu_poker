"""
OAuth Token Manager Service
Handles storing, retrieving, and auto-refreshing OAuth tokens for Google and Microsoft.
Solves the 1-hour token expiration problem by using refresh tokens.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Any
import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)


class OAuthTokenManager:
    """Manages OAuth tokens for Google and Microsoft with auto-refresh capability"""

    def __init__(self, db_connection, auth_provider=None):
        """
        Initialize OAuth Token Manager.

        Args:
            db_connection: Database connection object
            auth_provider: SimpleAuthProvider instance for refreshing tokens
        """
        self.db_connection = db_connection
        self.auth_provider = auth_provider

    async def store_tokens(
        self,
        user_email: str,
        provider: str,
        access_token: str,
        refresh_token: str,
        expires_in: int,
        scope: str = None,
        employee_id: int = None
    ) -> bool:
        """
        Store or update OAuth tokens in database.

        Args:
            user_email: User's email address
            provider: 'google' or 'microsoft'
            access_token: OAuth access token
            refresh_token: OAuth refresh token
            expires_in: Token expiry in seconds (usually 3600 for 1 hour)
            scope: OAuth scopes granted
            employee_id: Optional employee ID

        Returns:
            True if stored successfully
        """
        try:
            # Calculate token expiry timestamp
            token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

            cursor = self.db_connection.cursor()

            # Upsert token (insert or update if exists)
            upsert_sql = """
            INSERT INTO oauth_tokens (
                user_email, provider, access_token, refresh_token,
                token_expiry, scope, employee_id
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s
            )
            ON CONFLICT (user_email, provider)
            DO UPDATE SET
                access_token = EXCLUDED.access_token,
                refresh_token = EXCLUDED.refresh_token,
                token_expiry = EXCLUDED.token_expiry,
                scope = EXCLUDED.scope,
                employee_id = EXCLUDED.employee_id,
                updated_at = CURRENT_TIMESTAMP
            """

            cursor.execute(upsert_sql, (
                user_email, provider, access_token, refresh_token,
                token_expiry, scope, employee_id
            ))

            self.db_connection.commit()
            cursor.close()

            logger.info(f"✅ Stored {provider} tokens for {user_email} (expires: {token_expiry})")
            return True

        except Exception as e:
            logger.error(f"❌ Error storing OAuth tokens: {e}")
            self.db_connection.rollback()
            return False

    async def get_valid_access_token(
        self,
        user_email: str,
        provider: str
    ) -> Optional[str]:
        """
        Get a valid access token, auto-refreshing if expired.
        This is the main method to use for getting tokens.

        Args:
            user_email: User's email address
            provider: 'google' or 'microsoft'

        Returns:
            Valid access token or None if unavailable
        """
        try:
            cursor = self.db_connection.cursor(cursor_factory=RealDictCursor)

            # Get stored tokens
            select_sql = """
            SELECT access_token, refresh_token, token_expiry, scope, employee_id
            FROM oauth_tokens
            WHERE user_email = %s AND provider = %s
            """

            cursor.execute(select_sql, (user_email, provider))
            row = cursor.fetchone()
            cursor.close()

            if not row:
                logger.warning(f"⚠️ No {provider} tokens found for {user_email}")
                return None

            # Check if token is expired or will expire in next 5 minutes
            now = datetime.now(timezone.utc)
            token_expiry = row['token_expiry']

            # Make token_expiry timezone-aware if it isn't already
            if token_expiry.tzinfo is None:
                token_expiry = token_expiry.replace(tzinfo=timezone.utc)

            buffer_time = timedelta(minutes=5)

            if now + buffer_time >= token_expiry:
                # Token expired or about to expire - refresh it
                logger.info(f"🔄 Access token expired/expiring soon for {user_email}, refreshing...")

                new_access_token = await self._refresh_access_token(
                    user_email, provider, row['refresh_token'], row['scope'], row['employee_id']
                )

                if new_access_token:
                    return new_access_token
                else:
                    logger.error(f"❌ Failed to refresh token for {user_email}")
                    return None
            else:
                # Token still valid
                time_until_expiry = (token_expiry - now).total_seconds() / 60
                logger.info(f"✅ Access token valid for {user_email} ({time_until_expiry:.1f} minutes remaining)")
                return row['access_token']

        except Exception as e:
            logger.error(f"❌ Error getting valid access token: {e}")
            return None

    async def _refresh_access_token(
        self,
        user_email: str,
        provider: str,
        refresh_token: str,
        scope: str,
        employee_id: int
    ) -> Optional[str]:
        """
        Refresh the access token using refresh token.

        Args:
            user_email: User's email
            provider: 'google' or 'microsoft'
            refresh_token: Refresh token
            scope: OAuth scopes
            employee_id: Employee ID

        Returns:
            New access token or None if refresh failed
        """
        try:
            if not self.auth_provider:
                logger.error("❌ Auth provider not configured, cannot refresh token")
                return None

            # Use auth provider to refresh token
            logger.info(f"🔄 Calling {provider} token refresh API...")
            token_response = await self.auth_provider.refresh_token(
                refresh_token=refresh_token,
                service_name=provider
            )

            # Extract new tokens from response
            new_access_token = token_response.get('access_token')
            new_refresh_token = token_response.get('refresh_token', refresh_token)  # Use old one if not returned
            expires_in = token_response.get('expires_in', 3600)  # Default 1 hour

            if not new_access_token:
                logger.error(f"❌ No access token in refresh response for {provider}")
                return None

            # Store the new tokens
            await self.store_tokens(
                user_email=user_email,
                provider=provider,
                access_token=new_access_token,
                refresh_token=new_refresh_token,
                expires_in=expires_in,
                scope=scope,
                employee_id=employee_id
            )

            logger.info(f"✅ Successfully refreshed {provider} token for {user_email}")
            return new_access_token

        except Exception as e:
            logger.error(f"❌ Error refreshing access token: {e}")
            return None

    async def delete_tokens(self, user_email: str, provider: str) -> bool:
        """
        Delete stored tokens for a user and provider.

        Args:
            user_email: User's email
            provider: 'google' or 'microsoft'

        Returns:
            True if deleted successfully
        """
        try:
            cursor = self.db_connection.cursor()

            delete_sql = """
            DELETE FROM oauth_tokens
            WHERE user_email = %s AND provider = %s
            """

            cursor.execute(delete_sql, (user_email, provider))
            self.db_connection.commit()
            cursor.close()

            logger.info(f"✅ Deleted {provider} tokens for {user_email}")
            return True

        except Exception as e:
            logger.error(f"❌ Error deleting tokens: {e}")
            self.db_connection.rollback()
            return False

    async def get_token_info(self, user_email: str, provider: str) -> Optional[Dict[str, Any]]:
        """
        Get token information without refreshing.

        Args:
            user_email: User's email
            provider: 'google' or 'microsoft'

        Returns:
            Dictionary with token info or None
        """
        try:
            cursor = self.db_connection.cursor(cursor_factory=RealDictCursor)

            select_sql = """
            SELECT id, user_email, provider, token_expiry, scope,
                   employee_id, created_at, updated_at
            FROM oauth_tokens
            WHERE user_email = %s AND provider = %s
            """

            cursor.execute(select_sql, (user_email, provider))
            row = cursor.fetchone()
            cursor.close()

            if row:
                return dict(row)
            return None

        except Exception as e:
            logger.error(f"❌ Error getting token info: {e}")
            return None
