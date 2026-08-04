import { StoreShell } from '@/components/store/store-shell';
import { CartClient } from '@/components/store/cart-client';

export default function CartPage() {
  return (
    <StoreShell>
      <CartClient />
    </StoreShell>
  );
}
