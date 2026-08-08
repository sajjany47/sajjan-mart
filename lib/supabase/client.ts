'use client';

const API_BASE = '/api';

const TABLE_MAP: Record<string, string> = {
  product_images: 'product-images',
  product_variants: 'product-variants',
  add_on_items: 'add-on-items',
  product_add_ons: 'product-add-ons',
  puja_items: 'puja-items',
  puja_pandits: 'puja-pandits',
  support_tickets: 'support-tickets',
  essential_images: 'essential-images',
  order_items: 'order-items',
};

function makeClientQueryBuilder(table: string) {
  const apiTable = TABLE_MAP[table] ?? table;
  const params = new URLSearchParams();
  let method: 'GET' | 'POST' = 'GET';
  let bodyData: any = null;
  let mutationType: 'insert' | 'update' | 'delete' | null = null;
  let countExact = false;
  let headOnly = false;

  async function safeJson(res: Response) {
    const text = await res.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return { error: text }; }
  }

  const builder: any = {
    select(query?: string, opts?: { count?: 'exact'; head?: boolean }) {
      if (!mutationType) method = 'GET';
      if (opts?.count === 'exact') countExact = true;
      if (opts?.head) headOnly = true;
      return builder;
    },
    insert(data: any) {
      method = 'POST';
      mutationType = 'insert';
      bodyData = Array.isArray(data) ? data : [data];
      return builder;
    },
    update(data: any) {
      method = 'POST';
      mutationType = 'update';
      bodyData = data;
      return builder;
    },
    delete() {
      method = 'POST';
      mutationType = 'delete';
      return builder;
    },
    eq(field: string, value: any) {
      params.set(field, String(value));
      return builder;
    },
    in(field: string, values: any[]) {
      params.set(field, values.join(','));
      return builder;
    },
    ilike(field: string, pattern: string) {
      params.set(field + '_like', pattern.replace(/%/g, ''));
      return builder;
    },
    gte(field: string, value: number) {
      params.set(field + '_min', String(value));
      return builder;
    },
    lte(field: string, value: number) {
      params.set(field + '_max', String(value));
      return builder;
    },
    order(field: string, opts?: { ascending?: boolean }) {
      params.set('order', field);
      if (opts?.ascending === false) params.set('dir', 'desc');
      return builder;
    },
    limit(n: number) {
      params.set('limit', String(n));
      return builder;
    },
    range(start: number, end: number) {
      params.set('start', String(start));
      params.set('end', String(end));
      return builder;
    },
    single() {
      params.set('single', 'true');
      return builder;
    },
    async maybeSingle() {
      const url = `${API_BASE}/${apiTable}?${params.toString()}`;
      try {
        const res = await fetch(url);
        const data = await safeJson(res);
        if (Array.isArray(data)) return { data: data[0] || null, error: null };
        return { data: data || null, error: null };
      } catch (e) {
        return { data: null, error: e };
      }
    },
    async then(resolve: any) {
      if (mutationType) {
        if (mutationType === 'insert' && Array.isArray(bodyData)) {
          const results = [];
          for (const item of bodyData) {
            const res = await fetch(`${API_BASE}/${apiTable}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item),
            });
            const json = await safeJson(res);
            if (!res.ok) return resolve({ data: null, error: json });
            results.push(json);
          }
          const singleResult = results.length === 1 ? results[0] : results;
          return resolve({ data: singleResult, error: null });
        }

        if (mutationType === 'update' && bodyData) {
          const id = params.get('id');
          const url = id ? `${API_BASE}/${apiTable}/${id}` : `${API_BASE}/${apiTable}`;
          const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData),
          });
          const data = await safeJson(res);
          if (!res.ok) return resolve({ data: null, error: data });
          return resolve({ data, error: null });
        }

        if (mutationType === 'delete') {
          const id = params.get('id');
          let url = id ? `${API_BASE}/${apiTable}/${id}` : `${API_BASE}/${apiTable}`;
          const remaining = new URLSearchParams(params);
          if (id) remaining.delete('id');
          const qs = remaining.toString();
          if (qs) url += `?${qs}`;
          const res = await fetch(url, { method: 'DELETE' });
          const data = await safeJson(res);
          if (!res.ok) return resolve({ data: null, error: data });
          return resolve({ data, error: null });
        }

        return resolve({ data: null, error: { error: 'Unknown mutation' } });
      }

      const url = `${API_BASE}/${apiTable}?${params.toString()}`;
      try {
        const res = await fetch(url);
        const data = await safeJson(res);
        if (params.get('single') === 'true') {
          return resolve({
            data: Array.isArray(data) ? data[0] || null : data || null,
            error: null,
          });
        }
        const dataArr = Array.isArray(data) ? data : [data];
        return resolve({
          data: headOnly ? [] : dataArr,
          count: countExact ? dataArr.length : undefined,
          error: null,
        });
      } catch (e) {
        return resolve({ data: null, error: e });
      }
    },
    async upsert(data: any) {
      const res = await fetch(`${API_BASE}/${apiTable}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      return { data: result, error: null };
    },
  };

  return builder;
}

function makeAuthStub() {
  return {
    async getSession() {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return { data: { session: null }, error: null };
      const data = await res.json();
      return { data: { session: data.user ? { user: data.user } : null }, error: null };
    },
    onAuthStateChange(_cb: any) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    async signInWithPassword(_: any) {
      return { data: null, error: new Error('Use signIn from useAuth()') };
    },
    async signUp(_: any) {
      return { data: null, error: new Error('Use signUp from useAuth()') };
    },
    async signOut() {
      await fetch('/api/auth/logout', { method: 'POST' });
    },
    async resetPasswordForEmail(email: string, _opts?: any) {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return res.ok ? { data: {}, error: null } : { data: null, error: new Error('Failed') };
    },
    async updateUser(_data: any) {
      return { data: null, error: new Error('Use useAuth()') };
    },
  };
}

export const supabase = {
  from(table: string) {
    return makeClientQueryBuilder(table);
  },
  auth: makeAuthStub(),
};
