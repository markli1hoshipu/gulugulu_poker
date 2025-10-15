import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = 'http://localhost:6005'

export function useSocket() {
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    })

    socketInstance.on('connect', () => {
      console.log('Connected to server:', socketInstance.id)
    })

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from server')
    })

    socketInstance.on('connect_error', (error) => {
      console.error('Connection error:', error)
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.close()
    }
  }, [])

  return socket
}
