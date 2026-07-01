import { useEffect, useCallback } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { CarWashRecord } from '@/components/CarWashRecord';

interface UseRealtimeRecordsProps {
  onRecordAdded: (record: CarWashRecord) => void;
  onRecordUpdated: (record: CarWashRecord) => void;
  onRecordDeleted?: (recordId: string) => void;
}

export const useRealtimeRecords = ({
  onRecordAdded,
  onRecordUpdated,
  onRecordDeleted,
}: UseRealtimeRecordsProps) => {
  const { socket, isConnected, joinRoom } = useSocket();

  // Join the car wash room when connected
  useEffect(() => {
    if (isConnected) {
      joinRoom('car-wash-room');
    }
  }, [isConnected, joinRoom]);

  // Set up event listeners
  useEffect(() => {
    if (!socket) return;

    const handleRecordAdded = (record: CarWashRecord) => {
      console.log('Record added via WebSocket:', record);
      onRecordAdded(record);
    };

    const handleRecordUpdated = (record: CarWashRecord) => {
      console.log('Record updated via WebSocket:', record);
      onRecordUpdated(record);
    };

    const handleRecordDeleted = (recordId: string) => {
      console.log('Record deleted via WebSocket:', recordId);
      if (onRecordDeleted) {
        onRecordDeleted(recordId);
      }
    };

    // Listen for real-time events
    socket.on('record-added', handleRecordAdded);
    socket.on('record-updated', handleRecordUpdated);
    socket.on('record-deleted', handleRecordDeleted);

    // Cleanup listeners
    return () => {
      socket.off('record-added', handleRecordAdded);
      socket.off('record-updated', handleRecordUpdated);
      socket.off('record-deleted', handleRecordDeleted);
    };
  }, [socket, onRecordAdded, onRecordUpdated, onRecordDeleted]);

  return {
    isConnected,
  };
};
