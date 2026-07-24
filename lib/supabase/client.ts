'use client';

const API_BASE = '/api';

function makeClientQueryBuilder(table: string) {
  const params = new URLSearchParams();
  let method: 'GET' | 'POST' = 'GET';
  let bodyData: any = null;
  let countExact = false;
  let headOnly = false;

  const builder: any = {
    select(query?: string, opts?: { count?: 'exact'; head?: boolean }) {
      method = 'GET';
      if (opts?.count === 'exact') countExact = true;
      if (opts?.head) headOnly = true;
      return builder;
    },
    insert(data: any) {
      method = 'POST';
      bodyData = Array.isArray(data) ? data : [data];
      return builder;
    },
    update(data: any) {
      method = 'POST';
      bodyData = data;
      return builder;
    },
    delete() {
      method = 'POST';
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
    maybeSingle() {
      return builder.then(async (resolve: any) => {
        const url = `${API_BASE}/${table}?${params.toString()}`;
        try {
          const res = await fetch(url);
          const data = await res.json();
          if (Array.isArray(data)) return resolve({ data: data[0] || null, error: null });
          return resolve({ data: data || null, error: null });
        } catch (e) {
          return resolve({ data: null, error: e });
        }
      });
    },
    async then(resolve: any) {
      if (method === 'POST') {
        if (bodyData && Array.isArray(bodyData)) {
          const results = [];
          for (const item of bodyData) {
            const res = await fetch(API_BASE + '/' + table, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item),
            });
            results.push(await res.json());
          }
          return resolve({ data: results, error: null });
        }
        const id = params.get('id');
        const url = id
          ? `${API_BASE}/${table}/${id}`
          : `${API_BASE}/${table}`;
        const res = await fetch(url, {
          method: bodyData ? 'PUT' : 'DELETE',
          headers: bodyData ? { 'Content-Type': 'application/json' } : undefined,
          body: bodyData ? JSON.stringify(bodyData) : undefined,
        });
        const data = await res.json();
        return resolve({ data, error: null });
      }

      const url = `${API_BASE}/${table}?${params.toString()}`;
      try {
        const res = await fetch(url);
        const data = await res.json();
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
      const res = await fetch(`${API_BASE}/${table}`, {
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
