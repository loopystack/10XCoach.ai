"""
Real-time Communication Layer

This module provides an abstraction for real-time communication that can be
swapped between different implementations:

- HTTP (current): Simple turn-based request/response
- WebSocket (future): Bidirectional streaming
- WebRTC (future): Low-latency audio/video streaming

Usage:
    from app.services.realtime import get_transport, TransportType
    
    # Get the configured transport
    transport = get_transport(TransportType.HTTP)
    
    # Send a message
    await transport.send(session_id, message)
"""

from app.services.realtime.base import (
    TransportType,
    TransportMessage,
    TransportSession,
    BaseTransport
)
from app.services.realtime.http_transport import HTTPTransport
from app.services.realtime.manager import (
    ConnectionManager,
    get_connection_manager,
    get_transport
)

__all__ = [
    "TransportType",
    "TransportMessage", 
    "TransportSession",
    "BaseTransport",
    "HTTPTransport",
    "ConnectionManager",
    "get_connection_manager",
    "get_transport"
]

