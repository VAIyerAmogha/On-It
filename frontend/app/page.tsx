import Link from 'next/link';
import { ArrowRight, FileText, IndianRupee, Zap, CheckCircle2, ShieldCheck, Clock, TrendingUp } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full flex-1 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 flex flex-col font-sans">
      <main className="flex-1 w-full">
        {/* Hero Section */}
        <section className="relative pt-32 pb-40 overflow-hidden flex flex-col items-center text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-accent-500/10 via-transparent to-transparent dark:from-accent-500/5 dark:to-transparent pointer-events-none" />
          
          <div className="max-w-5xl mx-auto px-6 relative z-10 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-500/10 text-accent-600 dark:text-accent-400 font-medium text-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse"></span>
              Built for Indian Freelancers
            </div>
            
            <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-neutral-200 dark:to-neutral-400 leading-tight">
              Contract to Invoice.<br />On Autopilot.
            </h1>
            
            <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-400 mb-12 max-w-3xl leading-relaxed">
              Stop chasing payments and tracking spreadsheets. Upload your contract, let our AI extract the milestones, and we'll automatically generate GST-compliant invoices when they're due.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full max-w-md mx-auto">
              <Link
                href="/auth/register"
                className="w-full sm:w-auto px-10 py-5 bg-accent-500 hover:bg-accent-600 hover:-translate-y-1 text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-accent-500/25 flex items-center justify-center gap-3"
              >
                Start for Free <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/auth/login"
                className="w-full sm:w-auto px-10 py-5 bg-white/50 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10 backdrop-blur-sm border border-neutral-200 dark:border-neutral-800 rounded-2xl font-bold text-lg transition-all flex items-center justify-center hover:-translate-y-1"
              >
                Log In
              </Link>
            </div>
            
            <div className="mt-16 flex items-center justify-center gap-8 text-sm font-medium text-neutral-500">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> No credit card required</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Free forever plan</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> ₹0 setup cost</div>
            </div>
          </div>
        </section>

        {/* The Problem / Solution Section */}
        <section className="py-24 bg-white dark:bg-neutral-900 border-y border-neutral-200/50 dark:border-neutral-800/50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Freelancing is hard enough. Getting paid shouldn't be.</h2>
                <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 leading-relaxed">
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
                        <div className="w-10 h-10 rounded-full bg-accent-500/10 flex items-center justify-center text-accent-500">
                          <item.icon className="w-5 h-5" />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{item.title}</h4>
                        <p className="text-neutral-600 dark:text-neutral-400">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-accent-500/20 to-transparent blur-3xl -z-10 rounded-full" />
                <div className="glass-surface p-2 rounded-2xl border border-neutral-200/50 dark:border-neutral-700/50 shadow-2xl shadow-black/5 dark:shadow-black/20">
                  <div className="bg-neutral-50 dark:bg-neutral-950 rounded-xl p-6 md:p-8 space-y-6">
                    <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-4">
                      <div className="font-bold text-lg flex items-center gap-2">
                        <IndianRupee className="w-5 h-5 text-accent-500" /> Milestone 2
                      </div>
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-xs font-bold uppercase">Paid</span>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500">Trigger Condition</span>
                        <span className="font-medium text-right max-w-[200px]">Delivery of Phase 2 designs</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500">Base Amount</span>
                        <span className="font-medium">₹ 50,000</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500">GST (18%)</span>
                        <span className="font-medium">₹ 9,000</span>
                      </div>
                      <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                        <span className="font-bold">Invoice Generated</span>
                        <span className="font-bold text-lg text-accent-500">₹ 59,000</span>
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
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Three steps to peace of mind</h2>
              <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">From signed contract to paid invoice in a single automated pipeline.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-transparent via-accent-500/30 to-transparent" />
              {[
                {
                  icon: FileText,
                  title: "1. Upload your contract",
                  desc: "Drop your PDF or DOCX file. We support native digital contracts and scanned documents alike.",
                },
                {
                  icon: Zap,
                  title: "2. We extract milestones",
                  desc: "Our AI engine automatically identifies payment terms, percentages, and deliverable conditions.",
                },
                {
                  icon: IndianRupee,
                  title: "3. Get invoiced automatically",
                  desc: "Trigger a milestone and we instantly generate a GST-compliant invoice and email your client.",
                },
              ].map((step, i) => (
                <div key={i} className="glass-surface p-10 rounded-3xl relative z-10 text-center hover:-translate-y-2 hover:shadow-xl hover:shadow-accent-500/10 transition-all duration-300">
                  <div className="w-20 h-20 bg-accent-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8 text-accent-500 shadow-inner">
                    <step.icon className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                  <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-neutral-100 dark:bg-neutral-900/50 border-t border-neutral-200/50 dark:border-neutral-800/50">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Everything you need to run your freelance business</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
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
                <div key={i} className="bg-white dark:bg-black/40 p-8 md:p-10 rounded-3xl border border-neutral-200 dark:border-neutral-800 hover:border-accent-500/50 transition-colors">
                  <div className="flex gap-6">
                    <div className="shrink-0 mt-1">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                      <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-lg">{feature.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-accent-500/10 dark:bg-accent-500/5" />
          <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-8">Ready to automate your workflow?</h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-12">Join other freelancers who are saving hours every month on contract management and invoicing.</p>
            <Link
              href="/auth/register"
              className="inline-flex px-12 py-5 bg-accent-500 hover:bg-accent-600 hover:scale-105 text-white rounded-2xl font-bold text-xl transition-all shadow-xl shadow-accent-500/30 items-center justify-center gap-3"
            >
              Create Your Free Account <ArrowRight className="w-6 h-6" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-10 bg-white dark:bg-black">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent-500 to-accent-700">On-It</span>
            <span className="text-neutral-400">© {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex gap-8 font-medium text-sm">
            <Link href="/auth/login" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300 transition-colors">
              Log In
            </Link>
            <Link href="/auth/register" className="text-accent-600 dark:text-accent-400 hover:underline transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
