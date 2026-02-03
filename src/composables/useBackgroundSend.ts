import type { StartBackgroundSendOptions } from '@/services/messages/backgroundSendController';
import { backgroundSendController } from '@/services/messages/backgroundSendController';

export const useBackgroundSend = () => {
  const startBackgroundSend = async (options: StartBackgroundSendOptions): Promise<void> => {
    await backgroundSendController.start(options);
  };

  const stopBackgroundSend = async (): Promise<void> => {
    await backgroundSendController.stop();
  };

  return {
    running: backgroundSendController.state.running,
    stats: backgroundSendController.state.stats,
    error: backgroundSendController.state.error,
    startBackgroundSend,
    stopBackgroundSend
  };
};
