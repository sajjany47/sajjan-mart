'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { FormikTextPassword } from '@/components/FormikTextInput';

const ResetPasswordSchema = Yup.object().shape({
  password: Yup.string().required('Password is required'),
});

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Set a new password</h1>
      <p className="mt-1 text-sm text-muted-foreground">Enter your new password below.</p>

      <Formik
        initialValues={{ password: '' }}
        validationSchema={ResetPasswordSchema}
        onSubmit={async (values, { setSubmitting }) => {
          setLoading(true);
          try {
            const res = await fetch('/api/auth/update-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password: values.password }),
            });
            setLoading(false);
            setSubmitting(false);
            if (!res.ok) {
              const { error } = await res.json();
              toast.error(error || 'Failed to update password');
            } else {
              toast.success('Password updated. Please sign in.');
              router.push('/login');
            }
          } catch {
            setLoading(false);
            setSubmitting(false);
            toast.error('Failed to update password');
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form className="mt-6 space-y-4">
            <Field
              name="password"
              label="New Password"
              placeholder="Enter new password"
              component={FormikTextPassword}
            />
            <Button type="submit" className="w-full" disabled={loading || isSubmitting}>
              {loading ? 'Updating...' : 'Update password'}
            </Button>
          </Form>
        )}
      </Formik>
    </>
  );
}
