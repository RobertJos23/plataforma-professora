import Link from "next/link";
import { BookOpen, Star, MessageCircle, Award, Clock, Users, Zap, CheckCircle, ChevronRight } from "lucide-react";

// ─── Dados estáticos ──────────────────────────────────────

const testimonials = [
  {
    name: "Ana Carolina",
    level: "B2 → C1",
    text: "Em 8 meses passei no processo seletivo internacional que exigia inglês avançado. A metodologia é incrível!",
    rating: 5,
    avatar: "AC",
  },
  {
    name: "Pedro Henrique",
    level: "A1 → B1",
    text: "Nunca imaginei que aprenderia inglês tão rápido. As aulas são dinâmicas e o suporte da IA me ajuda 24h.",
    rating: 5,
    avatar: "PH",
  },
  {
    name: "Mariana Costa",
    level: "B1 → B2",
    text: "Finalmente consegui falar em reuniões com a equipe americana sem travar. Muito obrigada!",
    rating: 5,
    avatar: "MC",
  },
];

const plans = [
  {
    name: "Básico",
    price: "R$ 297",
    period: "/mês",
    description: "Para quem está começando",
    lessons: 4,
    features: [
      "4 aulas ao vivo por mês",
      "Materiais do nível básico",
      "Exercícios com correção automática",
      "Chatbot de dúvidas 24/7",
    ],
    highlight: false,
    cta: "Começar agora",
  },
  {
    name: "Standard",
    price: "R$ 497",
    period: "/mês",
    description: "O mais popular ⭐",
    lessons: 8,
    features: [
      "8 aulas ao vivo por mês",
      "Todos os materiais disponíveis",
      "Exercícios + correção por IA",
      "Simulador de conversação",
      "Correção de redações",
      "Relatório mensal de progresso",
    ],
    highlight: true,
    cta: "Escolher Standard",
  },
  {
    name: "Premium",
    price: "R$ 797",
    period: "/mês",
    description: "Para máxima evolução",
    lessons: 12,
    features: [
      "12 aulas ao vivo por mês",
      "Tudo do Standard +",
      "Análise de pronúncia por IA",
      "Aula extra bônus por mês",
      "Certificado digital",
      "Prioridade no agendamento",
      "Grupo VIP no WhatsApp",
    ],
    highlight: false,
    cta: "Ser Premium",
  },
];

const faqs = [
  {
    q: "Como funcionam as aulas?",
    a: "As aulas são 100% online via Zoom ou Google Meet, com duração de 60 minutos. Você agenda no horário que preferir diretamente pelo painel de aluno.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim! Não há contrato mínimo. Você pode cancelar ou pausar a assinatura a qualquer momento pelo app.",
  },
  {
    q: "O que é o suporte de IA 24/7?",
    a: "É a 'Lily', nossa assistente de inglês powered by Claude (Anthropic). Ela responde dúvidas de gramática, vocabulário e corrige exercícios a qualquer hora do dia.",
  },
  {
    q: "Em quanto tempo fico fluente?",
    a: "Depende do seu nível inicial e dedicação. Alunos que praticam diariamente evoluem em média 1 nível CEFR a cada 6 meses.",
  },
  {
    q: "Tem aula experimental?",
    a: "Sim! Oferecemos uma aula experimental gratuita de 30 minutos sem precisar de cartão de crédito. É só se cadastrar e agendar.",
  },
];

// ─── Componentes ──────────────────────────────────────────

function Navbar() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-lg font-bold text-gray-900">
            Pascini<span className="text-primary-500"> English</span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#sobre" className="text-sm text-gray-600 hover:text-primary-500 transition-colors">Sobre</a>
          <a href="#planos" className="text-sm text-gray-600 hover:text-primary-500 transition-colors">Planos</a>
          <a href="#depoimentos" className="text-sm text-gray-600 hover:text-primary-500 transition-colors">Depoimentos</a>
          <a href="#faq" className="text-sm text-gray-600 hover:text-primary-500 transition-colors">FAQ</a>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="btn-ghost text-sm py-2">
            Entrar
          </Link>
          <Link href="/auth/register" className="btn-primary text-sm py-2">
            Começar grátis
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="gradient-hero pt-24 pb-20">
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-1.5 text-sm font-medium text-primary-700">
          <Zap className="h-4 w-4" />
          Agora com IA para te ajudar 24/7
        </div>

        <h1 className="font-display text-5xl font-extrabold text-gray-900 md:text-6xl lg:text-7xl">
          Fale inglês com{" "}
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            confiança
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-xl text-gray-500">
          Aulas particulares online + materiais exclusivos + IA disponível a qualquer hora.
          Do A1 à fluência, no seu ritmo.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href="/auth/register" className="btn-primary text-base px-8 py-4">
            Aula experimental grátis
            <ChevronRight className="h-5 w-5" />
          </Link>
          <a href="#planos" className="btn-secondary text-base px-8 py-4">
            Ver planos
          </a>
        </div>

        <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary-500" />
            <span>+200 alunos</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            <span>4.9/5 avaliação</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary-500" />
            <span>+3.000 horas de aula</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="sobre" className="py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <h2 className="section-title">
              Sua professora de inglês
            </h2>
            <p className="section-subtitle">
              Com mais de 10 anos de experiência e certificação CELTA, ensino inglês para quem quer
              resultados reais — seja para trabalho, viagem ou simplesmente amar o idioma.
            </p>

            <ul className="mt-8 space-y-4">
              {[
                "Certificação CELTA (Cambridge)",
                "Especialização em Business English",
                "Metodologia comunicativa e dinâmica",
                "Foco em pronúncia e conversação",
                "Suporte personalizado via WhatsApp",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="h-5 w-5 shrink-0 text-primary-500" />
                  {item}
                </li>
              ))}
            </ul>

            <Link href="/auth/register" className="btn-primary mt-8 inline-flex">
              Quero aprender com você
            </Link>
          </div>

          <div className="relative">
            <div className="aspect-square overflow-hidden rounded-3xl bg-gradient-to-br from-primary-100 to-accent-100 p-8">
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-primary-500 text-4xl font-bold text-white font-display">
                    P
                  </div>
                  <p className="text-xl font-bold text-gray-800">Professora</p>
                  <p className="text-gray-500">CELTA Certified Teacher</p>
                  <div className="mt-4 flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Card flutuante */}
            <div className="absolute -bottom-6 -left-6 card shadow-lg">
              <p className="text-2xl font-bold text-primary-500 font-display">+200</p>
              <p className="text-sm text-gray-500">alunos formados</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Plans() {
  return (
    <section id="planos" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <h2 className="section-title">Escolha seu plano</h2>
          <p className="section-subtitle mx-auto">
            Sem contrato mínimo. Cancele quando quiser.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 ${
                plan.highlight
                  ? "bg-primary-500 text-white shadow-2xl shadow-primary-200 scale-105"
                  : "bg-white border border-gray-200"
              }`}
            >
              <div>
                <p className={`text-sm font-medium ${plan.highlight ? "text-primary-100" : "text-gray-500"}`}>
                  {plan.description}
                </p>
                <h3 className={`mt-1 text-2xl font-bold font-display ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                  {plan.name}
                </h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className={`text-4xl font-extrabold font-display ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ${plan.highlight ? "text-primary-100" : "text-gray-500"}`}>
                    {plan.period}
                  </span>
                </div>
                <p className={`mt-2 text-sm ${plan.highlight ? "text-primary-100" : "text-gray-500"}`}>
                  {plan.lessons} aulas por mês
                </p>
              </div>

              <ul className="mt-8 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckCircle
                      className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlight ? "text-primary-100" : "text-primary-500"}`}
                    />
                    <span className={`text-sm ${plan.highlight ? "text-primary-50" : "text-gray-600"}`}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/auth/register"
                className={`mt-8 block rounded-xl px-6 py-3 text-center text-sm font-semibold transition-all hover:scale-105 ${
                  plan.highlight
                    ? "bg-white text-primary-600 hover:bg-primary-50"
                    : "bg-primary-500 text-white hover:bg-primary-600"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section id="depoimentos" className="py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <h2 className="section-title">O que dizem os alunos</h2>
          <p className="section-subtitle mx-auto">
            Mais de 200 alunos já transformaram suas vidas com inglês.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="card">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 italic leading-relaxed">"{t.text}"</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-600">
                  {t.avatar}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-primary-500">{t.level}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <h2 className="section-title">Perguntas frequentes</h2>
        </div>

        <div className="mt-12 space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="card">
              <h3 className="font-semibold text-gray-900">{faq.q}</h3>
              <p className="mt-2 text-gray-600 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5511999999999";
  return (
    <section className="py-24">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <div className="rounded-3xl bg-gradient-to-r from-primary-500 to-accent-500 p-12 text-white">
          <h2 className="font-display text-4xl font-bold">
            Pronto para falar inglês?
          </h2>
          <p className="mt-4 text-lg text-primary-100">
            Comece hoje com uma aula experimental gratuita de 30 minutos.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/auth/register"
              className="rounded-xl bg-white px-8 py-4 font-semibold text-primary-600 shadow-lg transition-all hover:shadow-xl hover:scale-105"
            >
              Aula grátis agora
            </Link>
            <a
              href={`https://wa.me/${whatsapp}?text=Olá! Tenho interesse nas aulas de inglês.`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border-2 border-white/50 px-8 py-4 font-semibold text-white transition-all hover:bg-white/10"
            >
              <MessageCircle className="h-5 w-5" />
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-bold text-gray-900">Pascini English</span>
          </Link>
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} Plataforma da Professora. Todos os direitos reservados.
          </p>
          <div className="flex gap-4 text-sm text-gray-400">
            <Link href="/privacidade" className="hover:text-primary-500 transition-colors">Privacidade</Link>
            <Link href="/termos" className="hover:text-primary-500 transition-colors">Termos</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Página Principal ─────────────────────────────────────

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Plans />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
