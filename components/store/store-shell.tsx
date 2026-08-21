import { Header } from '@/components/store/header';
import { Footer } from '@/components/store/footer';
import { MobileBottomNav } from '@/components/store/mobile-bottom-nav';
import { createServerSupabase } from '@/lib/supabase/server';

export async function StoreShell({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabase();
  const { data } = await supabase.from('categories').select('slug').eq('is_active', true);
  const activeCategories = (data ?? []).map((c: any) => c.slug);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      <Header activeCategories={activeCategories} />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer activeCategories={activeCategories} />
      <MobileBottomNav />
    </div>
  );
}
