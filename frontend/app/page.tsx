'use client';

import Link from 'next/link';
import { ArrowRight, FileText, IndianRupee, Zap, CheckCircle2, ShieldCheck, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LandingPage() {
  const { token } = useAuth();
  const router = useRouter();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (token) {
      router.push('/dashboard');
    }
  }, [token, router]);

  return (
    <div className="min-h-screen w-full bg-bg-base text-text-primary flex flex-col font-sans selection:bg-accent selection:text-text-inverse">
      <main className="flex-1 w-full">
        {/* Hero Section */}
        <section className="relative pt-32 pb-40 overflow-hidden flex flex-col items-center text-center bg-gradient-hero">
          <div className="max-w-4xl mx-auto px-6 relative z-10 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-subtle text-accent border border-accent/20 font-medium text-xs mb-8 animate-in fade-in slide-in-from-bottom-4 duration-base">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
              Built for Indian Freelancers
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-text-primary leading-tight">
              Contract to Invoice.<br />On Autopilot.
            </h1>
            
            <p className="text-lg md:text-xl text-text-secondary mb-12 max-w-2xl leading-relaxed">
              Stop chasing payments and tracking spreadsheets. Upload your contract, let our AI extract the milestones, and we'll automatically generate GST-compliant invoices when they're due.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mx-auto">
              <Link
                href="/auth/register"
                className="w-full sm:w-auto px-8 py-4 bg-gradient-accent hover:bg-none hover:bg-accent-hover active:scale-[0.98] text-bg-base rounded-md font-semibold text-base transition-all flex items-center justify-center gap-2 shadow-accent cursor-pointer"
              >
                Start for Free <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </Link>
              <Link
                href="/auth/login"
                className="w-full sm:w-auto px-8 py-4 bg-transparent hover:bg-bg-elevated border border-border-default hover:border-border-strong text-text-primary rounded-md font-semibold text-base transition-all flex items-center justify-center active:scale-[0.98] cursor-pointer"
              >
                Log In
              </Link>
            </div>
            
            <div className="mt-16 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-text-muted">
              <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> No credit card required</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> Free forever plan</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> ₹0 setup cost</div>
            </div>
          </div>
        </section>

        {/* The Problem / Solution Section */}
        <section className="py-24 bg-bg-surface border-y border-border-subtle">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight text-text-primary">Freelancing is hard enough. Getting paid shouldn't be.</h2>
                <p className="text-base text-text-secondary mb-8 leading-relaxed">
                  Most freelancers spend hours manually parsing contracts, tracking deliverables in Excel, formatting invoices in Word, and sending awkward reminder emails. On-It replaces all of that with a single, automated workflow.
                </p>
                <div className="space-y-6">
                  {[
                    { title: "No more missed dates", desc: "We track your contract deadlines so you never forget to bill a client.", icon: Clock },
                    { title: "Professional by default", desc: "GST-compliant, beautifully formatted invoices sent automatically.", icon: ShieldCheck },
                    { title: "Focus on the work", desc: "Automated payment follow-ups handle the awkward conversations for you.", icon: TrendingUp }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="shrink-0 mt-1">
                        <div className="w-10 h-10 rounded-md bg-accent-subtle border border-accent/15 flex items-center justify-center text-accent">
                          <item.icon className="w-5 h-5" strokeWidth={1.5} />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-base text-text-primary">{item.title}</h4>
                        <p className="text-sm text-text-secondary mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-accent-subtle pointer-events-none blur-3xl -z-10 rounded-full" />
                <div className="glass p-8 shadow-modal border border-border-default">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-border-subtle pb-4">
                      <div className="font-bold text-lg flex items-center gap-2 text-text-primary">
                        <IndianRupee className="w-5 h-5 text-accent animate-pulse" strokeWidth={1.5} /> Milestone 2
                      </div>
                      <span className="px-2.5 py-0.5 bg-success-subtle text-status-paid rounded-full text-xs font-semibold tracking-wide">Paid</span>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Trigger Condition</span>
                        <span className="font-medium text-text-primary text-right max-w-[200px]">Delivery of Phase 2 designs</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Base Amount</span>
                        <span className="font-medium font-mono text-text-primary">₹ 50,000</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">GST (18%)</span>
                        <span className="font-medium font-mono text-text-primary">₹ 9,000</span>
                      </div>
                      <div className="pt-4 border-t border-border-subtle flex justify-between items-center">
                        <span className="font-semibold text-text-primary">Invoice Generated</span>
                        <span className="font-bold font-mono text-lg text-accent">₹ 59,000</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-32 relative">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight text-text-primary">Three steps to peace of mind</h2>
              <p className="text-base text-text-secondary max-w-xl mx-auto">From signed contract to paid invoice in a single automated pipeline.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {[
                {
                  icon: FileText,
                  title: "1. Upload contract",
                  desc: "Drop your PDF or DOCX file. We support native digital contracts and scanned documents alike.",
                },
                {
                  icon: Zap,
                  title: "2. Extract milestones",
                  desc: "Our AI engine automatically identifies payment terms, percentages, and deliverable conditions.",
                },
                {
                  icon: IndianRupee,
                  title: "3. Auto invoicing",
                  desc: "Trigger a milestone and we instantly generate a GST-compliant invoice and email your client.",
                },
              ].map((step, i) => (
                <div key={i} className="bg-gradient-surface border border-border-default p-8 rounded-lg text-center hover:bg-none hover:bg-bg-elevated hover:border-border-strong hover:shadow-elevated hover:-translate-y-1 transition-all duration-base ease-standard">
                  <div className="w-16 h-16 bg-accent-subtle rounded-md flex items-center justify-center mx-auto mb-6 text-accent border border-accent/10">
                    <step.icon className="w-8 h-8" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-text-primary">{step.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-bg-surface border-t border-border-subtle">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 tracking-tight text-text-primary">Everything you need to run your freelance business</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  title: "Automatic Extraction",
                  desc: "Stop tracking dates in spreadsheets. We extract payment schedules and conditions directly from your contract text."
                },
                {
                  title: "GST-Compliant Invoicing",
                  desc: "Generate professional, mathematically accurate invoices with just one click when a milestone is completed."
                },
                {
                  title: "Contract Q&A Chat",
                  desc: "Not sure about a clause? Ask our AI assistant specific questions about your uploaded contracts and get cited answers."
                },
                {
                  title: "Smart Follow-ups",
                  desc: "Automated, escalating email reminders sent to your clients when invoices become overdue. Never chase a payment again."
                }
              ].map((feature, i) => (
                <div key={i} className="bg-gradient-surface p-8 rounded-lg border border-border-default hover:bg-none hover:bg-bg-elevated hover:border-border-strong transition-colors duration-base">
                  <div className="flex gap-4">
                    <div className="shrink-0 mt-0.5">
                      <CheckCircle2 className="w-6 h-6 text-accent" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-text-primary">{feature.title}</h3>
                      <p className="text-sm text-text-secondary leading-relaxed">{feature.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-32 relative overflow-hidden bg-bg-base">
          <div className="max-w-2xl mx-auto px-6 relative z-10 text-center">
            <h2 className="text-4xl font-bold mb-6 tracking-tight text-text-primary">Ready to automate your workflow?</h2>
            <p className="text-base text-text-secondary mb-10 leading-relaxed">Join other freelancers who are saving hours every month on contract management and invoicing.</p>
            <Link
              href="/auth/register"
              className="inline-flex px-8 py-4 bg-gradient-accent hover:bg-none hover:bg-accent-hover text-bg-base rounded-md font-semibold text-base transition-all items-center justify-center gap-2 shadow-accent cursor-pointer"
            >
              Create Your Free Account <ArrowRight className="w-5 h-5" strokeWidth={2} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-subtle py-8 bg-bg-surface">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-accent select-none">On-It</span>
            <span className="text-xs text-text-muted">© {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex gap-6 font-medium text-xs">
            <Link href="/auth/login" className="text-text-secondary hover:text-text-primary transition-colors">
              Log In
            </Link>
            <Link href="/auth/register" className="text-accent hover:underline transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
