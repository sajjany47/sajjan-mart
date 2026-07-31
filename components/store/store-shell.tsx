import { Header } from '@/components/store/header';
import { Footer } from '@/components/store/footer';
import { createServerSupabase } from '@/lib/supabase/server';

export async function StoreShell({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabase();
  const { data } = await supabase.from('categories').select('slug').eq('is_active', true);
  const activeCategories = (data ?? []).map((c: any) => c.slug);

  return (
    <div className="flex min-h-screen flex-col">
      <Header activeCategories={activeCategories} />
      <main className="flex-1">{children}</main>
      <Footer activeCategories={activeCategories} />
    </div>
  );
}
