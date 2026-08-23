'use client';

import Link from 'next/link';
import { ShoppingBag, MapPin, CheckCircle2, ShieldCheck } from 'lucide-react';

interface StepperProps {
  currentStep: 1 | 2 | 3;
}

export function CheckoutStepper({ currentStep }: StepperProps) {
  const steps = [
    { number: 1, label: 'Shopping Cart', icon: ShoppingBag, href: '/cart' },
    { number: 2, label: 'Address & Payment', icon: MapPin, href: currentStep >= 2 ? '/checkout' : '#' },
    { number: 3, label: 'Order Confirmed', icon: CheckCircle2, href: '#' },
  ];

  return (
    <div className="w-full border-b border-border/50 bg-gradient-to-b from-card/80 via-card/40 to-background/50 py-4 mb-6 backdrop-blur-md">
      <div className="container-px mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-4 max-w-3xl mx-auto px-2">
          {steps.map((step, idx) => {
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;
            const Icon = step.icon;

            return (
              <div key={step.number} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div
                    className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-all duration-300 ${
                      isCompleted
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                        : isActive
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-4 ring-primary/20 scale-105'
                        : 'bg-muted/80 text-muted-foreground border border-border/60'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </div>
                  <div>
                    <span
                      className={`block text-[10px] font-bold uppercase tracking-wider ${
                        isActive ? 'text-primary' : isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                      }`}
                    >
                      Step 0{step.number}
                    </span>
                    <span
                      className={`block text-xs sm:text-sm font-medium leading-tight ${
                        isActive ? 'text-foreground font-bold' : isCompleted ? 'text-foreground font-semibold' : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                </div>

                {idx < steps.length - 1 && (
                  <div className="flex-1 mx-2 sm:mx-4 flex items-center">
                    <div
                      className={`h-[2px] w-full transition-all duration-500 rounded-full ${
                        currentStep > step.number ? 'bg-emerald-500' : 'bg-border/80'
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
