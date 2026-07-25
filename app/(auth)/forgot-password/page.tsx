'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { FormikTextInput } from '@/components/FormikTextInput';

const ForgotPasswordSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email address').required('Email is required'),
});

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  if (sent) {
    return (
      <>
        <h1 className="font-display text-2xl font-semibold">Check your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ve sent a password reset link to <strong>{sentEmail}</strong>. Click the link in the email to reset your password.
        </p>
        <Link href="/login" className="mt-6 inline-block">
          <Button variant="outline">Back to sign in</Button>
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Forgot password</h1>
      <p className="mt-1 text-sm text-muted-foreground">Enter your email and we&apos;ll send you a reset link.</p>

      <Formik
        initialValues={{ email: '' }}
        validationSchema={ForgotPasswordSchema}
        onSubmit={async (values, { setSubmitting }) => {
          try {
            const res = await fetch('/api/auth/reset-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: values.email }),
            });
            setSubmitting(false);
            if (!res.ok) {
              const { error } = await res.json();
              toast.error(error || 'Failed to send reset email');
            } else {
              setSentEmail(values.email);
              setSent(true);
              toast.success('If an account exists, a reset link will be sent.');
            }
          } catch {
            setSubmitting(false);
            toast.error('Failed to send reset email');
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
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send reset link'}
            </Button>
          </Form>
        )}
      </Formik>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered your password?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
      </p>
    </>
  );
}
