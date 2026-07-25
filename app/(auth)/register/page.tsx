'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { FormikTextInput, FormikTextPassword } from '@/components/FormikTextInput';

const RegisterSchema = Yup.object().shape({
  name: Yup.string().min(2, 'Name must be at least 2 characters').required('Name is required'),
  email: Yup.string().email('Invalid email address').required('Email is required'),
  password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

export default function RegisterPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">Join Sajjan Mart for food, puja, natural products and more.</p>

      <Formik
        initialValues={{ name: '', email: '', password: '' }}
        validationSchema={RegisterSchema}
        onSubmit={async (values, { setSubmitting }) => {
          setLoading(true);
          const { error } = await signUp(values.email, values.password, values.name);
          setLoading(false);
          setSubmitting(false);
          if (error) {
            toast.error(error);
          } else {
            toast.success('Account created! Welcome to Sajjan Mart.');
            router.push('/account');
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form className="mt-6 space-y-4">
            <Field
              name="name"
              label="Full Name"
              placeholder="Enter your full name"
              component={FormikTextInput}
            />
            <Field
              name="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              component={FormikTextInput}
            />
            <div>
              <Field
                name="password"
                label="Password"
                placeholder="Create a password"
                component={FormikTextPassword}
              />
              <p className="mt-1 text-xs text-muted-foreground">At least 6 characters.</p>
            </div>
            <Button type="submit" className="w-full" disabled={loading || isSubmitting}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </Form>
        )}
      </Formik>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
      </p>
    </>
  );
}
