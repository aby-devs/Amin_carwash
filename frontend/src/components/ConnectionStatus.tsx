import { useSocket } from '@/contexts/SocketContext';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

export function ConnectionStatus() {
  const { isConnected } = useSocket();

  return (
    <div className="fixed top-4 right-4 z-50">
      <Badge 
        variant={isConnected ? "default" : "destructive"}
        className="flex items-center gap-1"
      >
        {isConnected ? (
          <>
            <Wifi className="h-3 w-3" />
            Connected
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            Disconnected
          </>
        )}
      </Badge>
    </div>
  );
}
