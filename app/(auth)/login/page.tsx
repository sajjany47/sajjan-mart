'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { FormikTextInput, FormikTextPassword } from '@/components/FormikTextInput';

const LoginSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email address').required('Email is required'),
  password: Yup.string().required('Password is required'),
});

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') ?? '/account';
  const [loading, setLoading] = useState(false);

  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to your Sajjan Mart account.</p>

      <Formik
        initialValues={{ email: '', password: '' }}
        validationSchema={LoginSchema}
        onSubmit={async (values, { setSubmitting }) => {
          setLoading(true);
          const { error } = await signIn(values.email, values.password);
          setLoading(false);
          setSubmitting(false);
          if (error) {
            toast.error(error);
          } else {
            toast.success('Welcome back!');
            router.push(redirect);
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form className="mt-6 space-y-4">
            <Field
              name="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              component={FormikTextInput}
            />
            <div>
              <div className="flex justify-between">
                <span />
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <Field
                name="password"
                label="Password"
                placeholder="Enter your password"
                component={FormikTextPassword}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || isSubmitting}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </Form>
        )}
      </Formik>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Sajjan Mart?{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">Create an account</Link>
      </p>
    </>
  );
}
