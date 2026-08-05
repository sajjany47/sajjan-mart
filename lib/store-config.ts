import { prisma } from '@/lib/prisma/client';

export {
  isFoodOpenNow,
  isWithinSchedule,
  isPaymentModeAllowed,
  PAYMENT_METHODS,
  toMinutes,
} from '@/lib/store-config-utils';
export type { PaymentMode, StoreConfigShape } from '@/lib/store-config-utils';

export interface StoreConfigData {
  id: string;
  foodOpenTime: string;
  foodCloseTime: string;
  foodIsOpen: boolean;
  paymentMode: string;
  updatedAt: Date;
}

export const DEFAULT_STORE_CONFIG = {
  id: 'store',
  foodOpenTime: '10:00',
  foodCloseTime: '22:00',
  foodIsOpen: true,
  paymentMode: 'both',
} as const;

export async function getStoreConfig(): Promise<StoreConfigData> {
  let config = await prisma.storeConfig.findUnique({ where: { id: 'store' } });
  if (!config) {
    config = await prisma.storeConfig.create({ data: { ...DEFAULT_STORE_CONFIG } });
  }
  return config;
}
